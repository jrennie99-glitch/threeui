import * as THREE from "three";
import { shared } from "./shared";

export type SkinOptions = {
  sway: number;
  color?: string;
  roughness?: number;
  metalness?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  sheen?: number;
  sheenColor?: string;
  transmission?: number;
  thickness?: number;
  ior?: number;
  attenuationColor?: string;
  attenuationDistance?: number;
  emissive?: string;
  emissiveIntensity?: number;
  opacity?: number;
  side?: THREE.Side;
  vertexColors?: boolean;
  map?: THREE.Texture | null;
  normalMap?: THREE.Texture | null;
  roughnessMap?: THREE.Texture | null;
  normalScale?: number;
};

/**
 * Wet physical skin. The built-in PBR lighting stays; we only add a swim,
 * Beer–Lambert absorption (red dies first), and a caustic glint.
 */
export function physicalSkin(options: SkinOptions): THREE.MeshPhysicalMaterial {
  const material = new THREE.MeshPhysicalMaterial({
    color: options.color ?? "#ffffff",
    roughness: options.roughness ?? 0.32,
    metalness: options.metalness ?? 0,
    clearcoat: options.clearcoat ?? 0.45,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.18,
    sheen: options.sheen ?? 0.25,
    sheenColor: new THREE.Color(options.sheenColor ?? "#d7efe8"),
    sheenRoughness: 0.4,
    transmission: options.transmission ?? 0,
    thickness: options.thickness ?? 0.2,
    ior: options.ior ?? 1.4,
    attenuationColor: new THREE.Color(options.attenuationColor ?? "#7ee7ff"),
    attenuationDistance: options.attenuationDistance ?? 1.4,
    emissive: new THREE.Color(options.emissive ?? "#000000"),
    emissiveIntensity: options.emissiveIntensity ?? 0,
    opacity: options.opacity ?? 1,
    transparent: (options.opacity ?? 1) < 0.99,
    depthWrite: (options.opacity ?? 1) > 0.9 && (options.transmission ?? 0) < 0.2,
    side: options.side ?? THREE.FrontSide,
    vertexColors: options.vertexColors ?? false,
    map: options.map ?? null,
    normalMap: options.normalMap ?? null,
    roughnessMap: options.roughnessMap ?? null,
    envMapIntensity: 1.15,
  });
  if (options.normalScale) material.normalScale.set(options.normalScale, options.normalScale);
  const sway = options.sway;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shared.uTime;
    shader.uniforms.uSway = { value: sway };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        attribute float aPhase;
        attribute vec3 aTint;
        uniform float uTime;
        uniform float uSway;
        varying vec3 vTint;
        varying vec3 vAbsorbPos;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        if (uSway > 0.5 && uSway < 1.5) {
          float tail = smoothstep(0.05, -0.55, transformed.z);
          transformed.x += sin(uTime * 6.5 + aPhase) * tail * 0.22;
        } else if (uSway > 1.5 && uSway < 2.5) {
          float h = smoothstep(-0.5, 0.5, transformed.y);
          transformed.x += sin(uTime * 0.7 + aPhase + h * 3.0) * h * h * 0.42;
          transformed.z += cos(uTime * 0.55 + aPhase) * h * h * 0.18;
        } else if (uSway > 2.5 && uSway < 3.5) {
          float wing = smoothstep(0.2, 2.2, abs(transformed.x));
          transformed.y += sin(uTime * 1.6 + aPhase) * wing * 0.36;
        } else if (uSway > 3.5 && uSway < 4.5) {
          float tail = smoothstep(-1.0, -4.2, transformed.z);
          transformed.y += sin(uTime * 1.3 + aPhase) * tail * 0.65;
        } else if (uSway > 4.5 && uSway < 5.5) {
          float wing = smoothstep(0.05, 0.28, abs(transformed.x));
          transformed.y += sin(uTime * 8.0 + aPhase) * wing * 0.35;
        } else if (uSway > 5.5 && uSway < 6.5) {
          float pulse = sin(uTime * 1.45 + aPhase);
          transformed.xz *= 1.0 + pulse * 0.055;
          transformed.y *= 1.0 - pulse * 0.08;
        } else if (uSway > 6.5 && uSway < 7.5) {
          float h = clamp(-transformed.y, 0.0, 1.2);
          transformed.x += sin(uTime * 1.25 + aPhase + h * 4.5) * h * 0.2;
          transformed.z += cos(uTime * 1.05 + aPhase + h * 4.0) * h * 0.2;
        }
        vTint = aTint;
        #ifdef USE_INSTANCING
          vAbsorbPos = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vAbsorbPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        varying vec3 vTint;
        varying vec3 vAbsorbPos;
        uniform float uTime;`,
      )
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
        diffuseColor.rgb *= vTint;`,
      )
      .replace(
        "#include <opaque_fragment>",
        `float depth = clamp(-min(vAbsorbPos.y, 0.0), 0.0, 14.0);
        vec3 absorb = vec3(exp(-depth * 0.11), exp(-depth * 0.035), exp(-depth * 0.02));
        float cau = 0.0;
        if (vAbsorbPos.y < -0.2) {
          cau = pow(abs(sin(vAbsorbPos.x * 1.6 + uTime * 0.7) * sin(vAbsorbPos.z * 1.25 - uTime * 0.55)), 7.0);
          cau += pow(abs(sin(vAbsorbPos.x * 3.2 - uTime) * sin(vAbsorbPos.z * 2.6 + uTime * 0.8)), 10.0);
          cau *= smoothstep(0.0, 0.45, normal.y) * exp(-depth * 0.045);
        }
        outgoingLight = outgoingLight * absorb + vec3(0.55, 0.82, 0.75) * cau * 0.16;
        #include <opaque_fragment>`,
      );
  };
  return material;
}

let scaleNormal: THREE.CanvasTexture | null = null;

/** Overlapping scale ridges, generated so the fish stay CC0 and texture-backed. */
export function getScaleNormal(): THREE.CanvasTexture {
  if (scaleNormal) return scaleNormal;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("scale normal");
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const row = Math.floor(y / 28);
      const ox = (row % 2) * 16;
      const cx = ((x + ox) % 32) - 16;
      const cy = (y % 28) - 14;
      const r = Math.sqrt(cx * cx + cy * cy * 1.6);
      const edge = Math.max(0, 1 - r / 15);
      const dx = cx * edge * 0.35;
      const dy = cy * edge * 0.35;
      const i = (y * size + x) * 4;
      image.data[i] = 128 + dx * 90;
      image.data[i + 1] = 128 + dy * 90;
      image.data[i + 2] = 255;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  scaleNormal = new THREE.CanvasTexture(canvas);
  scaleNormal.wrapS = THREE.RepeatWrapping;
  scaleNormal.wrapT = THREE.RepeatWrapping;
  scaleNormal.repeat.set(6, 3);
  scaleNormal.colorSpace = THREE.NoColorSpace;
  return scaleNormal;
}

export function repeat(texture: THREE.Texture, times: number, color = false): THREE.Texture {
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(times, times);
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.anisotropy = 8;
  return texture;
}
