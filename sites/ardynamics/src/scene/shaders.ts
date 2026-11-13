/** Shared noise. Value noise, not a texture, so the site ships no image maps. */
export const GLSL_NOISE = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 17.1;
    a *= 0.5;
  }
  return v;
}
float causticPattern(vec2 uv, float t) {
  vec2 p = uv;
  float c = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    p += vec2(sin(t * 0.33 + fi * 1.7), cos(t * 0.27 + fi * 2.1)) * 0.35;
    vec2 n = floor(p);
    vec2 f = fract(p);
    float m = 8.0;
    for (int j = -1; j <= 1; j++) {
      for (int k = -1; k <= 1; k++) {
        vec2 g = vec2(float(k), float(j));
        vec2 o = vec2(hash12(n + g), hash12(n + g + 19.19));
        o = 0.5 + 0.5 * sin(t * 0.6 + 6.28318 * o);
        vec2 r = g - f + o;
        m = min(m, dot(r, r));
      }
    }
    c += pow(1.0 - smoothstep(0.0, 0.085, m), 2.0);
    p = p * 1.9 + vec2(3.1, 1.7);
  }
  return c / 3.0;
}
`;

/** Sky and water share this so the reflection is the same sky you see. */
export const GLSL_SKY = /* glsl */ `
${GLSL_NOISE}
uniform float uTime;
uniform vec3 uSunDir;

vec3 skyColor(vec3 rd) {
  vec3 sun = normalize(uSunDir);
  float h = rd.y;
  vec3 zenith = vec3(0.10, 0.28, 0.55);
  vec3 high = vec3(0.33, 0.52, 0.78);
  vec3 horizon = vec3(0.98, 0.62, 0.34);
  vec3 below = vec3(0.55, 0.28, 0.16);
  vec3 col = mix(horizon, high, smoothstep(0.0, 0.28, h));
  col = mix(col, zenith, smoothstep(0.18, 0.72, h));
  col = mix(below, col, smoothstep(-0.18, 0.06, h));
  float clouds = 0.0;
  if (rd.y > 0.0) {
    vec2 cuv = rd.xz / max(rd.y, 0.045) * 0.18;
    cuv += vec2(uTime * 0.012, uTime * 0.004);
    float f = fbm(cuv);
    clouds = smoothstep(0.46, 0.74, f) * smoothstep(0.0, 0.16, rd.y);
    clouds *= smoothstep(0.72, 0.2, rd.y);
    vec3 cloudCol = mix(vec3(0.96, 0.58, 0.36), vec3(1.0, 0.95, 0.9), smoothstep(0.0, 0.35, rd.y));
    col = mix(col, cloudCol, clouds * 0.88);
  }
  float sunDot = max(dot(rd, sun), 0.0);
  float disc = smoothstep(0.9994, 0.99985, sunDot);
  float glow = pow(sunDot, 64.0);
  float wide = pow(sunDot, 6.0);
  col += vec3(1.0, 0.93, 0.82) * disc * (1.0 - clouds * 0.85) * 4.0;
  col += vec3(1.0, 0.62, 0.28) * glow * (1.0 - clouds * 0.55) * 0.9;
  col += vec3(0.95, 0.45, 0.18) * wide * 0.28;
  return col;
}
`;

export const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vDir = world.xyz - cameraPosition;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const SKY_FRAG = /* glsl */ `
precision highp float;
varying vec3 vDir;
${GLSL_SKY}
void main() {
  gl_FragColor = vec4(skyColor(normalize(vDir)), 1.0);
}
`;

export const WATER_VERT = /* glsl */ `
uniform float uTime;
uniform float uDetail;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vCrest;
varying float vDist;

vec3 gerstner(vec2 xz, float t, out vec3 normal, out float crest) {
  vec3 p = vec3(0.0);
  vec3 tang = vec3(1.0, 0.0, 0.0);
  vec3 bin = vec3(0.0, 0.0, 1.0);
  crest = 0.0;
  // dir.x, dir.y, amplitude, wavelength, steepness Q, phase
  vec4 W[4];
  W[0] = vec4(1.0, 0.18, 0.62, 42.0);
  W[1] = vec4(0.12, 1.0, 0.34, 19.0);
  W[2] = vec4(-0.72, 0.48, 0.16, 11.0);
  W[3] = vec4(0.55, -0.78, 0.075, 6.5);
  float Qs[4];
  Qs[0] = 0.78; Qs[1] = 0.66; Qs[2] = 0.5; Qs[3] = 0.38;
  int count = uDetail > 0.5 ? 4 : 3;
  for (int i = 0; i < 4; i++) {
    if (i >= count) break;
    vec2 dir = normalize(W[i].xy);
    float A = W[i].z;
    float L = W[i].w;
    float k = 6.2831853 / L;
    float q = Qs[i];
    float speed = sqrt(9.8 / k) * 0.42;
    float f = k * dot(dir, xz) - speed * k * t;
    float s = sin(f);
    float co = cos(f);
    p.x += q * A * dir.x * co;
    p.z += q * A * dir.y * co;
    p.y += A * s;
    float kA = k * A;
    tang.x -= q * dir.x * dir.x * kA * s;
    tang.y += dir.x * kA * co;
    tang.z -= q * dir.x * dir.y * kA * s;
    bin.x -= q * dir.x * dir.y * kA * s;
    bin.y += dir.y * kA * co;
    bin.z -= q * dir.y * dir.y * kA * s;
    crest += A * max(s, 0.0);
  }
  normal = normalize(cross(bin, tang));
  return p;
}

void main() {
  vec4 world0 = modelMatrix * vec4(position, 1.0);
  vec3 disp;
  vec3 n;
  float crest;
  disp = gerstner(world0.xz, uTime, n, crest);
  float dist = length(world0.xz - cameraPosition.xz);
  float atten = 1.0 - smoothstep(55.0, 150.0, dist);
  world0.xyz += disp * atten;
  vWorld = world0.xyz;
  vNormal = n;
  vCrest = crest * atten;
  vDist = dist;
  gl_Position = projectionMatrix * viewMatrix * world0;
}
`;

export const WATER_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uScene;
uniform float uHasScene;
uniform vec2 uResolution;
uniform float uUnder;
uniform vec3 uUfoPos;
uniform vec3 uFogColor;
uniform sampler2D uSky;
uniform float uHasSky;
varying vec3 vWorld;
varying vec3 vNormal;
varying float vCrest;
varying float vDist;
${GLSL_SKY}
vec3 sampleSky(vec3 rd) {
  if (uHasSky < 0.5) return skyColor(rd);
  vec3 d = normalize(rd);
  vec2 uv = vec2(atan(d.z, d.x) * 0.159154943 + 0.5, 1.0 - (asin(clamp(d.y, -1.0, 1.0)) * 0.318309886 + 0.5));
  return texture2D(uSky, uv).rgb;
}

void main() {
  vec3 N = normalize(vNormal);
  float n1 = noise(vWorld.xz * 1.7 + uTime * 0.18);
  float nx = noise(vWorld.xz * 1.7 + vec2(0.12, 0.0) + uTime * 0.18);
  float nz = noise(vWorld.xz * 1.7 + vec2(0.0, 0.12) + uTime * 0.18);
  N.x += (nx - n1) * 1.6;
  N.z += (nz - n1) * 1.6;
  N = normalize(N);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 sun = normalize(uSunDir);

  if (uUnder > 0.5) {
    vec3 I = normalize(vWorld - cameraPosition);
    vec3 nDown = normalize(vec3(N.x * 0.45, -1.0, N.z * 0.45));
    vec3 outR = refract(I, nDown, 1.0 / 1.333);
    vec3 col;
    if (dot(outR, outR) < 0.0001) {
      float cau = causticPattern(vWorld.xz * 0.55, uTime);
      col = vec3(0.03, 0.16, 0.20) + vec3(0.45, 0.7, 0.72) * cau * 0.35;
    } else {
      col = sampleSky(normalize(outR));
      float cau = causticPattern(vWorld.xz * 0.7, uTime);
      col += vec3(0.75, 0.9, 0.95) * cau * 0.22;
    }
    float ufo = pow(clamp(1.0 - length(vWorld - uUfoPos) / 18.0, 0.0, 1.0), 2.0);
    col += vec3(0.45, 0.8, 1.0) * ufo;
    float d = length(cameraPosition - vWorld);
    float fogF = 1.0 - exp(-0.00055 * d * d);
    col = mix(col, uFogColor, clamp(fogF, 0.0, 0.65));
    gl_FragColor = vec4(col, 1.0);
    return;
  }

  // Schlick, air-water F0. Exponent follows the rim curve used in the
  // Community liquid-form shader, retuned for water.
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
  vec3 R = reflect(-V, N);
  vec3 reflection = sampleSky(R);
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 disp = N.xz * 0.045;
  vec3 refr;
  if (uHasScene > 0.5) {
    // Per-channel offset, scaled down from the Community glass-bead shader.
    refr.r = texture2D(uScene, clamp(uv + disp * 1.12, 0.001, 0.999)).r;
    refr.g = texture2D(uScene, clamp(uv + disp, 0.001, 0.999)).g;
    refr.b = texture2D(uScene, clamp(uv + disp * 0.88, 0.001, 0.999)).b;
  } else {
    float depthCue = clamp(0.35 + ndv, 0.0, 1.0);
    refr = mix(vec3(0.02, 0.18, 0.24), vec3(0.05, 0.45, 0.48), depthCue);
    refr += vec3(0.35, 0.55, 0.5) * causticPattern(vWorld.xz * 0.4, uTime) * 0.18;
  }
  vec3 col = mix(refr, reflection, fres);
  vec3 H = normalize(sun + V);
  float spec = pow(max(dot(N, H), 0.0), mix(48.0, 700.0, fres));
  float spark = smoothstep(0.62, 0.95, noise(vWorld.xz * 9.0 + uTime * 0.45));
  col += vec3(1.0, 0.94, 0.8) * spec * (0.55 + spark) * 2.4;
  float sss = pow(max(dot(V, -sun), 0.0), 3.0) * smoothstep(0.08, 0.4, vCrest);
  col += vec3(0.45, 0.72, 0.42) * sss * 0.35;
  float foam = smoothstep(0.22, 0.62, vCrest) * smoothstep(0.4, 0.8, noise(vWorld.xz * 2.2 + vec2(0.0, uTime * 0.3)));
  col = mix(col, vec3(0.82, 0.9, 0.9), foam * 0.55);
  vec3 horizon = vec3(0.97, 0.66, 0.4);
  col = mix(col, horizon, smoothstep(70.0, 165.0, vDist) * 0.85);
  gl_FragColor = vec4(col, 1.0);
}
`;

export const CREATURE_VERT = /* glsl */ `
attribute vec3 color;
attribute vec3 aTint;
attribute float aPhase;
uniform float uTime;
uniform float uSway;
varying vec3 vColor;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vPhase;

void main() {
  vColor = color * aTint;
  vPhase = aPhase;
  vec3 transformed = position;
  if (uSway > 0.5 && uSway < 1.5) {
    float tail = smoothstep(0.02, -0.48, position.z);
    transformed.x += sin(uTime * 7.0 + aPhase) * tail * 0.26;
  } else if (uSway > 1.5 && uSway < 2.5) {
    float h = smoothstep(-0.5, 0.5, position.y);
    transformed.x += sin(uTime * 0.72 + aPhase + h * 3.1) * h * h * 0.46;
    transformed.z += cos(uTime * 0.55 + aPhase * 1.3) * h * h * 0.22;
  } else if (uSway > 2.5 && uSway < 3.5) {
    float wing = smoothstep(0.25, 2.4, abs(position.x));
    transformed.y += sin(uTime * 1.65 + aPhase) * wing * 0.42;
  } else if (uSway > 3.5 && uSway < 4.5) {
    float tail = smoothstep(-1.2, -4.4, position.z);
    transformed.y += sin(uTime * 1.35 + aPhase) * tail * 0.7;
  } else if (uSway > 4.5 && uSway < 5.5) {
    float wing = smoothstep(0.06, 0.28, abs(position.x));
    transformed.y += sin(uTime * 8.5 + aPhase) * wing * 0.42;
  }
  #ifdef USE_INSTANCING
    vec4 world = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  #else
    vec4 world = modelMatrix * vec4(transformed, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
  #endif
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const CREATURE_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uShine;
uniform float uAlpha;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec3 uSunDir;
uniform vec3 uUfoPos;
uniform vec3 uCityPos;
varying vec3 vColor;
varying vec3 vNormalW;
varying vec3 vWorld;
${GLSL_NOISE}

void main() {
  vec3 N = normalize(vNormalW);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 L = normalize(uSunDir);
  float depth = clamp(-min(vWorld.y, 0.0), 0.0, 70.0);
  float sunFade = exp(-depth * 0.04);
  vec3 upCol = mix(vec3(0.62, 0.78, 0.74), vec3(0.18, 0.28, 0.34), clamp(depth / 28.0, 0.0, 1.0));
  vec3 downCol = vec3(0.03, 0.05, 0.07);
  vec3 hemi = mix(downCol, upCol, N.y * 0.5 + 0.5);
  float ndl = max(dot(N, L), 0.0);
  float wrap = max(dot(N, L) * 0.45 + 0.55, 0.0);
  vec3 col = vColor * (hemi * 0.62 + vec3(1.0, 0.9, 0.72) * (ndl * 0.55 + wrap * 0.22) * sunFade);
  vec3 H = normalize(L + V);
  float spec = pow(max(dot(N, H), 0.0), mix(8.0, 180.0, uShine));
  col += spec * uShine * sunFade * vec3(1.0, 0.97, 0.9) * 0.9;
  if (vWorld.y < -0.25) {
    float cau = causticPattern(vWorld.xz * 0.42, uTime);
    col += cau * vec3(0.55, 0.82, 0.75) * smoothstep(0.0, 0.45, N.y) * sunFade * 0.7;
  }
  float ufo = pow(clamp(1.0 - length(vWorld - uUfoPos) / 16.0, 0.0, 1.0), 2.0);
  col += vec3(0.4, 0.78, 1.0) * ufo * 0.85;
  float city = pow(clamp(1.0 - length(vWorld - uCityPos) / 26.0, 0.0, 1.0), 1.5);
  col += (vec3(0.3, 0.85, 1.0) * 0.8 + vec3(1.0, 0.7, 0.35) * 0.35) * city;
  // Glass-bead fresnel exponent from the Community dock shader, used as a wet rim.
  float fres = pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 3.4);
  col += fres * vec3(0.65, 0.82, 0.86) * (0.08 + uShine * 0.28);
  float d = length(cameraPosition - vWorld);
  float fogF = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
  col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0));
  gl_FragColor = vec4(col, uAlpha);
}
`;

export const JELLY_VERT = /* glsl */ `
attribute vec3 aTint;
attribute float aPhase;
uniform float uTime;
uniform float uKind;
varying vec3 vTint;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vPhase;
varying float vLocalY;

void main() {
  vTint = aTint;
  vPhase = aPhase;
  vec3 transformed = position;
  if (uKind < 0.5) {
    float pulse = sin(uTime * 1.5 + aPhase);
    transformed.xz *= 1.0 + pulse * 0.07;
    transformed.y *= 1.0 - pulse * 0.1;
  } else {
    float h = clamp(-position.y, 0.0, 1.0);
    transformed.x += sin(uTime * 1.3 + aPhase + h * 5.0) * h * 0.22;
    transformed.z += cos(uTime * 1.1 + aPhase * 1.7 + h * 4.0) * h * 0.22;
  }
  vLocalY = transformed.y;
  #ifdef USE_INSTANCING
    vec4 world = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  #else
    vec4 world = modelMatrix * vec4(transformed, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
  #endif
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const JELLY_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform float uKind;
varying vec3 vTint;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vPhase;
varying float vLocalY;

void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.1);
  float pulse = 0.72 + 0.28 * sin(uTime * 1.45 + vPhase);
  vec3 bio = vTint * pulse;
  // Power falloff in the family of the Community emerald-horizon glow.
  float body = pow(clamp(vLocalY * 0.5 + 0.5, 0.0, 1.0), 1.5);
  vec3 col = bio * (0.18 + body * 0.35) + bio * fres * 1.7;
  col += bio * pow(fres, 3.0) * 1.4;
  if (uKind > 0.5) col *= 0.55;
  float d = length(cameraPosition - vWorld);
  float fogF = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
  col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0));
  float alpha = uKind < 0.5 ? (0.22 + fres * 0.55) : (0.12 + fres * 0.4);
  alpha *= 1.0 - clamp(fogF, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;

export const SAND_VERT = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormalW;
void main() {
  vec3 p = position;
  p.y += sin(position.x * 0.35) * 0.08 + sin(position.z * 0.22) * 0.06;
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const SAND_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec3 uColor;
uniform float uCity;
uniform vec3 uCityPos;
varying vec3 vWorld;
varying vec3 vNormalW;
${GLSL_NOISE}
void main() {
  vec3 N = normalize(vNormalW);
  float rip = noise(vWorld.xz * 0.8);
  vec3 sand = uColor * (0.82 + rip * 0.28);
  float cau = causticPattern(vWorld.xz * 0.38, uTime);
  float sunFade = exp(-clamp(-min(vWorld.y, 0.0), 0.0, 60.0) * 0.045);
  vec3 col = sand * (0.35 + 0.4 * N.y) + vec3(0.65, 0.85, 0.75) * cau * sunFade * 0.85;
  if (uCity > 0.5) {
    float r = length(vWorld.xz - uCityPos.xz);
    float rings = smoothstep(0.045, 0.0, abs(fract(r * 0.16 - uTime * 0.03) - 0.5) - 0.46);
    col += vec3(0.35, 0.9, 1.0) * rings * 0.55;
    float city = pow(clamp(1.0 - r / 22.0, 0.0, 1.0), 1.4);
    col += vec3(0.25, 0.7, 0.9) * city * 0.45;
  }
  float d = length(cameraPosition - vWorld);
  float fogF = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
  col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}
`;

export const RAY_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const RAY_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
varying vec2 vUv;
void main() {
  float n = sin(vUv.x * 16.0 + sin(vUv.y * 3.0 + uTime * 0.25) * 1.4 + uTime * 0.15);
  float shaft = pow(abs(n), 7.0);
  shaft *= smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.15, vUv.y);
  shaft *= smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
  vec3 col = vec3(0.72, 0.9, 0.82) * shaft * 1.4;
  gl_FragColor = vec4(col, shaft * 0.28);
}
`;

export const GLYPH_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const GLYPH_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec3 uFogColor;
uniform float uFogDensity;
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vec2 g = fract(vUv * vec2(4.0, 9.0));
  float colId = floor(vUv.x * 4.0);
  float row = floor(vUv.y * 9.0);
  float bar = step(0.18, g.x) * step(g.x, 0.28);
  float cross = step(0.42, g.y) * step(g.y, 0.52);
  float dotp = smoothstep(0.08, 0.02, length(g - vec2(0.68, 0.32 + 0.08 * sin(colId + row))));
  float scan = fract(vUv.y * 9.0 - uTime * 0.18 + colId * 0.13);
  float gate = smoothstep(0.0, 0.15, scan) * (1.0 - smoothstep(0.62, 0.95, scan));
  float rune = clamp((bar + cross + dotp) * gate, 0.0, 1.0);
  vec3 bio = mix(vec3(0.35, 0.95, 1.0), vec3(1.0, 0.72, 0.35), 0.5 + 0.5 * sin(row + uTime));
  vec3 col = bio * rune * 1.8;
  float d = length(cameraPosition - vWorld);
  float fogF = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
  col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0) * 0.65);
  float alpha = rune * (1.0 - fogF * 0.35);
  if (alpha < 0.02) discard;
  gl_FragColor = vec4(col, alpha);
}
`;

export const GLASS_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const GLASS_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec3 uTint;
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 3.4);
  vec3 col = mix(uTint * 0.18, uTint, fres);
  col += vec3(0.7, 0.95, 1.0) * pow(fres, 2.0) * 0.8;
  float d = length(cameraPosition - vWorld);
  float fogF = 1.0 - exp(-uFogDensity * uFogDensity * d * d);
  col = mix(col, uFogColor, clamp(fogF, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}
`;

export const GLOW_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;
uniform float uGain;
void main() {
  gl_FragColor = vec4(uColor * uGain, 1.0);
}
`;

export const UFO_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vLocal;
void main() {
  vLocal = position;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormalW = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const UFO_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform float uKind;
varying vec3 vNormalW;
varying vec3 vWorld;
varying vec3 vLocal;
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 3.0);
  vec3 col;
  if (uKind < 0.5) {
    vec3 base = vec3(0.07, 0.09, 0.11);
    float spec = pow(max(dot(N, normalize(vec3(0.4, 0.6, 0.4) + V)), 0.0), 40.0);
    col = base + vec3(0.7, 0.85, 1.0) * fres * 0.9 + vec3(1.0) * spec * 0.5;
    float band = smoothstep(0.02, 0.0, abs(vLocal.y));
    col += vec3(0.4, 0.85, 1.0) * band * 1.5;
  } else if (uKind < 1.5) {
    col = mix(vec3(0.05, 0.12, 0.16), vec3(0.6, 0.95, 1.0), fres);
    col += vec3(0.5, 0.9, 1.0) * 0.25;
  } else {
    float pulse = 0.75 + 0.25 * sin(uTime * 3.0);
    col = vec3(0.45, 0.9, 1.0) * (1.6 + fres) * pulse;
  }
  gl_FragColor = vec4(col, 1.0);
}
`;

export const BEAM_FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
varying vec3 vLocal;
void main() {
  float down = clamp(-vLocal.y / 4.1, 0.0, 1.0);
  float width = mix(0.18, 1.45, down);
  float r = length(vLocal.xz) / width;
  if (r > 1.0) discard;
  float core = pow(1.0 - r, 1.7);
  float fall = 1.0 - down;
  float flick = 0.86 + 0.14 * sin(uTime * 5.0 + vLocal.y * 2.0);
  float a = core * fall * flick;
  vec3 col = mix(vec3(0.35, 0.78, 1.0), vec3(0.9, 0.97, 1.0), core);
  gl_FragColor = vec4(col * (0.7 + core), a);
}
`;

export const BUBBLE_VERT = /* glsl */ `
attribute float aPhase;
uniform float uTime;
varying float vPhase;
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vPhase = aPhase;
  #ifdef USE_INSTANCING
    vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
  #else
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
  #endif
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

export const BUBBLE_FRAG = /* glsl */ `
precision highp float;
varying vec3 vNormalW;
varying vec3 vWorld;
void main() {
  vec3 N = normalize(vNormalW);
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(abs(dot(N, V)), 0.0, 1.0), 2.0);
  float spec = pow(max(dot(N, normalize(vec3(0.2, 1.0, 0.3))), 0.0), 30.0);
  vec3 col = vec3(0.75, 0.9, 0.95) * fres + vec3(1.0) * spec;
  float d = length(cameraPosition - vWorld);
  float fade = exp(-0.01 * d * d);
  gl_FragColor = vec4(col, (0.08 + fres * 0.45) * fade);
}
`;

export const PLANKTON_VERT = /* glsl */ `
attribute float aSize;
attribute float aKind;
uniform float uTime;
varying float vKind;
varying float vDepth;
void main() {
  vec3 world = position;
  world.y -= uTime * mix(0.12, 0.35, aKind);
  vec3 d = world - cameraPosition;
  float span = 22.0;
  d = mod(d + span * 0.5, span) - span * 0.5;
  world = cameraPosition + d;
  vec4 mv = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mv;
  float above = step(-0.4, world.y);
  gl_PointSize = aSize * (70.0 / max(1.0, -mv.z)) * (1.0 - above);
  vKind = aKind;
  vDepth = world.y;
}
`;

export const PLANKTON_FRAG = /* glsl */ `
precision highp float;
varying float vKind;
varying float vDepth;
void main() {
  if (vDepth > -0.4) discard;
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = dot(p, p);
  if (r > 1.0) discard;
  float a = pow(1.0 - r, 1.6);
  vec3 col = mix(vec3(0.75, 0.9, 0.7), vec3(0.45, 0.85, 1.0), vKind);
  if (vDepth < -46.0) col = mix(vec3(0.45, 0.95, 1.0), vec3(1.0, 0.72, 0.4), vKind);
  gl_FragColor = vec4(col * (0.6 + a), a * 0.85);
}
`;
