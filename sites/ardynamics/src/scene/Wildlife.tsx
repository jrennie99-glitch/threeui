import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";
import { dive, mulberry32, pointerActive } from "../dive";
import { quality } from "../quality";
import { createBrainCoral, createBranchCoral, createBubbleGeometry, createFanCoral, createRockGeometry } from "./geometries";
import { BUBBLE_FRAG, BUBBLE_VERT, PLANKTON_FRAG, PLANKTON_VERT } from "./shaders";
import { shared } from "./shared";
import { getScaleNormal, physicalSkin } from "./physical";

const _dummy = new THREE.Object3D();
const _forward = new THREE.Vector3(0, 0, 1);
const _dir = new THREE.Vector3();
const _sep = new THREE.Vector3();
const _ali = new THREE.Vector3();
const _coh = new THREE.Vector3();
const _steer = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _closest = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();

type Boid = { p: THREE.Vector3; v: THREE.Vector3; phase: number };

function loadGltf(url: string): Promise<GLTF> {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(url, resolve, undefined, reject);
  });
}

function preparePrototype(root: THREE.Object3D, targetSize: number, scales = false): void {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z, 0.0001);
  root.scale.multiplyScalar(targetSize / maxAxis);
  root.updateMatrixWorld(true);
  const fitted = new THREE.Box3().setFromObject(root);
  const center = fitted.getCenter(new THREE.Vector3());
  root.position.sub(center);
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;
    const material = mesh.material;
    const list = Array.isArray(material) ? material : [material];
    for (const entry of list) {
      const physical = entry as THREE.MeshStandardMaterial;
      if (physical && "envMapIntensity" in physical) {
        physical.envMapIntensity = 1.1;
        if (scales) {
          physical.normalMap = getScaleNormal();
          physical.normalScale = new THREE.Vector2(0.65, 0.65);
          physical.roughness = Math.min(physical.roughness, 0.38);
        }
      }
    }
  });
}

function swimClip(gltf: GLTF): THREE.AnimationClip | null {
  return (
    gltf.animations.find((clip) => /swimming_normal/i.test(clip.name)) ??
    gltf.animations.find((clip) => /swim/i.test(clip.name)) ??
    gltf.animations[0] ??
    null
  );
}

function useCameraFrame(fn: (camera: THREE.Camera) => void): void {
  const { camera } = useThree();
  useFrame(() => {
    fn(camera);
  }, -8);
}


function SpeciesSchool(props: {
  url: string;
  count: number;
  home: [number, number, number];
  spread: number;
  speed: number;
  size: number;
  yaw?: number;
  scales?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const state = useRef<{ obj: THREE.Object3D; mixer: THREE.AnimationMixer | null; boid: Boid }[]>([]);
  const anchor = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const holder = group.current;
    if (!holder) return undefined;
    let dead = false;
    void loadGltf(props.url).then((gltf) => {
      if (dead) return;
      const proto = gltf.scene;
      preparePrototype(proto, props.size, props.scales);
      const clip = swimClip(gltf);
      const rand = mulberry32(props.url.length * 13 + props.count);
      for (let i = 0; i < props.count; i += 1) {
        const obj = cloneSkinned(proto);
        holder.add(obj);
        const mixer = clip ? new THREE.AnimationMixer(obj) : null;
        if (mixer && clip) {
          const action = mixer.clipAction(clip);
          action.play();
          mixer.setTime(rand() * clip.duration);
        }
        state.current.push({
          obj,
          mixer,
          boid: {
            p: new THREE.Vector3(
              props.home[0] + (rand() - 0.5) * props.spread * 2,
              props.home[1] + (rand() - 0.5) * props.spread * 0.4,
              props.home[2] + (rand() - 0.5) * props.spread * 2,
            ),
            v: new THREE.Vector3(rand() - 0.5, (rand() - 0.5) * 0.08, rand() - 0.5).normalize().multiplyScalar(props.speed),
            phase: rand() * 8,
          },
        });
      }
    });
    return () => {
      dead = true;
      for (const entry of state.current) {
        entry.mixer?.stopAllAction();
        holder.remove(entry.obj);
      }
      state.current = [];
    };
  }, [props.url, props.count, props.size, props.speed, props.spread, props.scales, props.home[0], props.home[1], props.home[2]]);

  useCameraFrame((camera) => {
    const entries = state.current;
    if (!entries.length) return;
    const dt = dive.dt;
    anchor.set(
      props.home[0] + Math.sin(dive.time * 0.13) * 1.2,
      props.home[1],
      props.home[2] + Math.cos(dive.time * 0.11) * 1.3,
    );
    let ray: THREE.Ray | null = null;
    if (pointerActive()) {
      _ndc.set(dive.pointerX, dive.pointerY);
      _raycaster.setFromCamera(_ndc, camera);
      ray = _raycaster.ray;
    }
    for (let i = 0; i < entries.length; i += 1) {
      const b = entries[i].boid;
      _sep.set(0, 0, 0);
      _ali.set(0, 0, 0);
      _coh.set(0, 0, 0);
      let nSep = 0;
      let n = 0;
      const neighbor = Math.min(entries.length, i + 18);
      const start = Math.max(0, i - 18);
      for (let j = start; j < neighbor; j += 1) {
        if (i === j) continue;
        const dist = b.p.distanceTo(entries[j].boid.p);
        if (dist < props.size * 1.6 && dist > 1e-4) {
          _sep.add(_tmp.copy(b.p).sub(entries[j].boid.p).multiplyScalar(1 / dist));
          nSep += 1;
        }
        if (dist < props.size * 5) {
          _ali.add(entries[j].boid.v);
          _coh.add(entries[j].boid.p);
          n += 1;
        }
      }
      _steer.set(0, 0, 0);
      if (nSep) _steer.add(_sep.multiplyScalar(1.2));
      if (n) {
        _ali.multiplyScalar(1 / n);
        _steer.add(_ali.sub(b.v).multiplyScalar(0.45));
        _coh.multiplyScalar(1 / n);
        _steer.add(_tmp.copy(_coh).sub(b.p).multiplyScalar(0.25));
      }
      _tmp.copy(anchor).sub(b.p);
      if (_tmp.length() > props.spread) _steer.add(_tmp.multiplyScalar(0.7));
      if (ray) {
        const t = _tmp.copy(b.p).sub(ray.origin).dot(ray.direction);
        if (t > 0 && t < 20) {
          _closest.copy(ray.origin).addScaledVector(ray.direction, t);
          const d = _closest.distanceTo(b.p);
          if (d < 2) _steer.add(_tmp.copy(b.p).sub(_closest).multiplyScalar((2 - d) * 2.5));
        }
      }
      b.v.addScaledVector(_steer, dt);
      if (b.v.length() > props.speed) b.v.setLength(props.speed);
      b.p.addScaledVector(b.v, dt);
      entries[i].mixer?.update(dt);
      const obj = entries[i].obj;
      obj.position.copy(b.p);
      if (b.v.lengthSq() > 1e-5) {
        _dir.copy(b.v).normalize();
        obj.quaternion.setFromUnitVectors(_forward, _dir);
        if (props.yaw) obj.rotateY(props.yaw);
      }
    }
  });

  return <group ref={group} />;
}

function kelpTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("kelp");
  ctx.clearRect(0, 0, 128, 512);
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "rgba(214, 196, 92, 0.95)");
  gradient.addColorStop(0.45, "rgba(46, 110, 62, 0.95)");
  gradient.addColorStop(1, "rgba(12, 48, 32, 0.98)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(64, 4);
  for (let y = 8; y <= 504; y += 6) {
    const w = 6 + Math.sin(y * 0.045) * 7 + Math.sin(y * 0.13) * 4 + (y / 512) * 28;
    ctx.lineTo(64 + w, y);
  }
  ctx.lineTo(64, 508);
  for (let y = 504; y >= 8; y -= 6) {
    const w = 4 + Math.sin(y * 0.06 + 1.2) * 5 + Math.sin(y * 0.11) * 3 + (y / 512) * 16;
    ctx.lineTo(64 - w, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(214, 236, 150, 0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(64, 12);
  ctx.lineTo(66, 500);
  ctx.stroke();
  ctx.globalCompositeOperation = "destination-in";
  const fade = ctx.createLinearGradient(0, 0, 128, 0);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(0.18, "rgba(0,0,0,0.55)");
  fade.addColorStop(0.5, "rgba(0,0,0,1)");
  fade.addColorStop(0.82, "rgba(0,0,0,0.5)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, 128, 512);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const KELP_VERT = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
attribute float aPhase;
void main() {
  vUv = uv;
  vec3 p = position;
  float h = uv.y;
  p.x += sin(uTime * 0.7 + aPhase + h * 3.0) * h * h * 0.35;
  p.z += cos(uTime * 0.5 + aPhase) * h * h * 0.16;
  #ifdef USE_INSTANCING
    vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
  #else
    vec4 world = modelMatrix * vec4(p, 1.0);
  #endif
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const KELP_FRAG = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
void main() {
  vec4 tex = texture2D(uMap, vUv);
  if (tex.a < 0.3) discard;
  float backlight = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 1.4);
  vec3 col = tex.rgb + vec3(0.45, 0.75, 0.28) * backlight * 0.45;
  gl_FragColor = vec4(col, tex.a * 0.92);
}
`;

function KelpForest({
  count,
  origin,
  radius,
  seed,
}: {
  count: number;
  origin: [number, number, number];
  radius: [number, number];
  seed: number;
}) {
  const map = useMemo(() => kelpTexture(), []);
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(0.55, 1, 1, 8);
    g.translate(0, 0.5, 0);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i += 1) phases[i] = Math.random() * 6;
    g.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
    return g;
  }, [count]);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uMap: { value: map } },
        vertexShader: KELP_VERT,
        fragmentShader: KELP_FRAG,
        side: THREE.DoubleSide,
        transparent: true,
      }),
    [map],
  );
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const inst = mesh.current;
    if (!inst) return;
    const rand = mulberry32(seed);
    for (let i = 0; i < count; i += 1) {
      const a = rand() * Math.PI * 2;
      const r = radius[0] + rand() * (radius[1] - radius[0]);
      const h = 2.4 + rand() * 4.4;
      const width = 0.22 + rand() * 1.45;
      _dummy.position.set(origin[0] + Math.cos(a) * r, origin[1], origin[2] + Math.sin(a) * r * 0.85);
      _dummy.rotation.set(0, rand() * Math.PI, 0);
      _dummy.scale.set(width, h, 1);
      _dummy.updateMatrix();
      inst.setMatrixAt(i, _dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    return () => {
      geo.dispose();
      mat.dispose();
      map.dispose();
    };
  }, [count, geo, map, mat, origin[0], origin[1], origin[2], radius[0], radius[1], seed]);
  useFrame(() => {
    mat.uniforms.uTime.value = dive.time;
  });
  return <instancedMesh ref={mesh} args={[geo, mat, count]} dispose={null} frustumCulled={false} />;
}

function Shells() {
  const group = useRef<THREE.Group>(null);
  useEffect(() => {
    const holder = group.current;
    if (!holder) return undefined;
    let dead = false;
    void loadGltf("/models/lambis/lambis_shell_1k.gltf").then((gltf) => {
      if (dead) return;
      const proto = gltf.scene;
      preparePrototype(proto, 0.7);
      const rand = mulberry32(9);
      for (let i = 0; i < (quality.dof ? 7 : 3); i += 1) {
        const obj = proto.clone(true);
        const a = rand() * Math.PI * 2;
        const r = 2 + rand() * 7;
        obj.position.set(Math.cos(a) * r, -13.05, -15 + Math.sin(a) * r * 0.7);
        obj.rotation.set(rand(), rand() * 6, rand());
        obj.scale.multiplyScalar(0.6 + rand() * 0.8);
        holder.add(obj);
      }
    });
    return () => {
      dead = true;
    };
  }, []);
  return <group ref={group} />;
}

function Jellyfish({ count }: { count: number }) {
  const geo = useMemo(() => {
    const pts = [0.02, 0.2, 0.55, 0.7, 0.62, 0.4, 0.18].map((r, i) => new THREE.Vector2(r, i * 0.16));
    const bell = new THREE.LatheGeometry(pts, 40);
    const n = bell.attributes.position.count;
    bell.setAttribute("aTint", new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    bell.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(n), 1));
    return bell;
  }, []);
  const mat = useMemo(
    () =>
      physicalSkin({
        sway: 6,
        color: "#d7fbff",
        roughness: 0.06,
        transmission: quality.dof ? 0.9 : 0,
        thickness: 0.35,
        ior: 1.33,
        attenuationColor: "#7ef0ff",
        attenuationDistance: 0.5,
        emissive: "#1a6a78",
        emissiveIntensity: 0.7,
        opacity: quality.dof ? 1 : 0.45,
        side: THREE.DoubleSide,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      }),
    [],
  );
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const inst = mesh.current;
    if (!inst) return;
    const rand = mulberry32(21);
    for (let i = 0; i < count; i += 1) {
      const a = rand() * Math.PI * 2;
      const r = 3 + rand() * 8;
      _dummy.position.set(Math.cos(a) * r, -8 - rand() * 16, -10 - rand() * 8);
      _dummy.rotation.set(0, rand() * 6, 0);
      _dummy.scale.setScalar(0.7 + rand() * 0.6);
      _dummy.updateMatrix();
      inst.setMatrixAt(i, _dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [count, geo, mat]);
  return <instancedMesh ref={mesh} args={[geo, mat, count]} dispose={null} frustumCulled={false} />;
}

function ReefGarden({ y, z, count, seed }: { y: number; z: number; count: number; seed: number }) {
  const geos = useMemo(() => [createBrainCoral(), createBranchCoral(), createFanCoral(), createRockGeometry()], []);
  const mats = useMemo(
    () => [
      new THREE.MeshStandardMaterial({ color: "#f3ddd4", roughness: 0.72 }),
      new THREE.MeshStandardMaterial({ color: "#efe6dc", roughness: 0.68 }),
      new THREE.MeshStandardMaterial({ color: "#e4d5d4", roughness: 0.64, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.94, metalness: 0.04 }),
    ],
    [],
  );
  const spots = useMemo(() => {
    const rand = mulberry32(seed);
    return Array.from({ length: count }, (_, i) => {
      const a = rand() * Math.PI * 2;
      const r = 1.2 + rand() * 9;
      return {
        kind: i % 4,
        pos: [Math.cos(a) * r, y, z + Math.sin(a) * r * 0.85] as [number, number, number],
        rot: rand() * Math.PI * 2,
        scale: 0.4 + rand() * 0.95,
      };
    });
  }, [count, seed, y, z]);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let alive = true;
    void Promise.all([
      loader.loadAsync("/textures/rock_diff.jpg"),
      loader.loadAsync("/textures/rock_nor.jpg"),
      loader.loadAsync("/textures/rock_arm.jpg"),
    ]).then(([diff, nor, arm]) => {
      if (!alive) return;
      for (const tex of [diff, nor, arm]) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
      }
      diff.colorSpace = THREE.SRGBColorSpace;
      const rock = mats[3];
      rock.map = diff;
      rock.normalMap = nor;
      rock.roughnessMap = arm;
      rock.needsUpdate = true;
      for (const mat of mats.slice(0, 3)) {
        mat.map = diff;
        mat.normalMap = nor;
        mat.normalScale.set(0.55, 0.55);
        mat.needsUpdate = true;
      }
    });
    return () => {
      alive = false;
    };
  }, [mats]);
  return (
    <group>
      {spots.map((spot, i) => (
        <mesh
          key={i}
          geometry={geos[spot.kind]}
          material={mats[spot.kind]}
          position={spot.pos}
          rotation={[spot.kind === 2 ? 1.1 : 0.15, spot.rot, 0]}
          scale={spot.kind === 2 ? spot.scale * 0.28 : spot.scale * 0.72}
        />
      ))}
    </group>
  );
}

function SeaTurtle() {
  const group = useRef<THREE.Group>(null);
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const shell = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 36, 22);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const scute = 1 + Math.max(0, y) * 0.08 * Math.cos(Math.atan2(z, x) * 5) * Math.cos(y * 7);
      pos.setXYZ(i, x * scute * 1.15, y * scute * 0.48, z * scute * 1.45);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);
  const flipper = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.45, 16, 10);
    geo.scale(1.7, 0.12, 0.7);
    geo.translate(0.7, 0, 0.15);
    return geo;
  }, []);
  const shellMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#6f8b5c",
        roughness: 0.48,
        metalness: 0.04,
        clearcoat: 0.4,
        clearcoatRoughness: 0.25,
        normalMap: getScaleNormal(),
        normalScale: new THREE.Vector2(0.8, 0.8),
      }),
    [],
  );
  const skin = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#c4b48a",
        roughness: 0.55,
        clearcoat: 0.2,
        normalMap: getScaleNormal(),
        normalScale: new THREE.Vector2(0.4, 0.4),
      }),
    [],
  );
  useCameraFrame(() => {
    const root = group.current;
    if (!root) return;
    const a = dive.time * 0.18;
    const x = Math.cos(a) * 6.5;
    const z = -15 + Math.sin(a) * 4.2;
    root.position.set(x, -9.4 + Math.sin(dive.time * 0.6) * 0.12, z);
    root.rotation.y = -a + Math.PI / 2;
    const flap = Math.sin(dive.time * 1.6) * 0.7;
    if (left.current) left.current.rotation.z = flap;
    if (right.current) right.current.rotation.z = -flap;
  });
  return (
    <group ref={group} scale={1.35}>
      <mesh geometry={shell} material={shellMat} />
      <mesh material={skin} position={[0, -0.22, 0.15]}>
        <sphereGeometry args={[0.72, 16, 10]} />
      </mesh>
      <mesh material={skin} position={[0, 0.05, 1.15]}>
        <sphereGeometry args={[0.22, 12, 10]} />
      </mesh>
      <mesh ref={left} geometry={flipper} material={skin} position={[0.15, -0.05, 0.2]} />
      <mesh ref={right} geometry={flipper} material={skin} position={[-0.15, -0.05, 0.2]} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

function MarineSnow() {
  const bubbles = quality.bubbles;
  const plankton = quality.plankton;
  const bubbleGeo = useMemo(() => {
    const g = createBubbleGeometry();
    const phases = new Float32Array(bubbles);
    for (let i = 0; i < bubbles; i += 1) phases[i] = Math.random() * 6;
    g.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
    return g;
  }, [bubbles]);
  const bubbleMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: shared.uTime },
        vertexShader: BUBBLE_VERT,
        fragmentShader: BUBBLE_FRAG,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  const parts = useMemo(() => {
    const rand = mulberry32(19);
    return Array.from({ length: bubbles }, () => ({
      p: new THREE.Vector3((rand() - 0.5) * 18, -rand() * 28, -rand() * 20),
      s: 0.035 + rand() * 0.08,
      v: 0.28 + rand() * 0.7,
    }));
  }, [bubbles]);
  const bubbleMesh = useRef<THREE.InstancedMesh>(null);
  const snow = useMemo(() => {
    const positions = new Float32Array(plankton * 3);
    const sizes = new Float32Array(plankton);
    const kinds = new Float32Array(plankton);
    const rand = mulberry32(23);
    for (let i = 0; i < plankton; i += 1) {
      positions[i * 3] = (rand() - 0.5) * 40;
      positions[i * 3 + 1] = (rand() - 0.5) * 40;
      positions[i * 3 + 2] = (rand() - 0.5) * 40;
      sizes[i] = 1.2 + rand() * 2.8;
      kinds[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("aKind", new THREE.BufferAttribute(kinds, 1));
    return g;
  }, [plankton]);
  const snowMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: shared.uTime },
        vertexShader: PLANKTON_VERT,
        fragmentShader: PLANKTON_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [],
  );
  useCameraFrame((camera) => {
    const mesh = bubbleMesh.current;
    if (!mesh) return;
    const cam = camera.position;
    for (let i = 0; i < parts.length; i += 1) {
      const b = parts[i];
      b.p.y += dive.dt * b.v;
      if (b.p.y > Math.min(-0.2, cam.y + 3)) {
        b.p.set(cam.x + (Math.random() - 0.5) * 10, cam.y - 3 - Math.random() * 10, cam.z - 2 - Math.random() * 12);
      }
      _dummy.position.copy(b.p);
      _dummy.scale.setScalar(b.s);
      _dummy.rotation.set(0, 0, 0);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={bubbleMesh} args={[bubbleGeo, bubbleMat, bubbles]} dispose={null} frustumCulled={false} />
      <points geometry={snow} material={snowMat} frustumCulled={false} />
    </group>
  );
}

export function Wildlife() {
  const school = quality.dof ? 28 : 10;
  return (
    <group>
      <SpeciesSchool url="/models/cute_fish_pack/BlueTang.glb" count={school} home={[1.2, -9.2, -14]} spread={4.5} speed={0.85} size={0.42} scales />
      <SpeciesSchool url="/models/cute_fish_pack/Clownfish.glb" count={school} home={[-1.6, -10.1, -16]} spread={3.6} speed={0.7} size={0.28} scales />
      <SpeciesSchool url="/models/cute_fish_pack/YellowTang.glb" count={Math.round(school * 0.7)} home={[2.4, -8.6, -12]} spread={3.2} speed={0.75} size={0.32} scales />
      <SpeciesSchool url="/models/cute_fish_pack/ParrotFish.glb" count={Math.round(school * 0.45)} home={[-2.2, -11.2, -18]} spread={4} speed={0.6} size={0.48} scales />
      <SpeciesSchool url="/models/fish_pack/Manta_ray.glb" count={1} home={[0, -8.4, -16]} spread={6} speed={0.55} size={3.4} />
      <SpeciesSchool url="/models/fish_pack/Whale.glb" count={1} home={[8, -26, -46]} spread={6} speed={0.32} size={18} />
      <SpeciesSchool url="/models/fish_pack/Shark.glb" count={1} home={[4, -14, -18]} spread={6} speed={0.7} size={2.8} />
      <SeaTurtle />
      <KelpForest count={quality.kelp} origin={[0, -13.22, -15]} radius={[4, 14]} seed={77} />
      <KelpForest count={quality.dof ? 18 : 8} origin={[0, -63.05, 0]} radius={[6.4, 11]} seed={91} />
      <ReefGarden y={-13.05} z={-15} count={quality.coral + quality.rocks} seed={14} />
      <ReefGarden y={-62.95} z={0} count={quality.dof ? 14 : 6} seed={27} />
      <Jellyfish count={quality.jellies} />
      <Shells />
      <MarineSnow />
    </group>
  );
}
