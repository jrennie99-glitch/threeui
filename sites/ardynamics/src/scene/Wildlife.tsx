import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import * as THREE from "three";
import { dive, mulberry32, pointerActive } from "../dive";
import { quality } from "../quality";

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

function preparePrototype(root: THREE.Object3D, targetSize: number): void {
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
      if (physical && "envMapIntensity" in physical) physical.envMapIntensity = 1.1;
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
      preparePrototype(proto, props.size);
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
  }, [props.url, props.count, props.size, props.speed, props.spread, props.home[0], props.home[1], props.home[2]]);

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
  ctx.moveTo(64, 8);
  for (let y = 8; y <= 500; y += 8) {
    const w = 10 + Math.sin(y * 0.05) * 8 + (y / 512) * 22;
    ctx.lineTo(64 + w, y);
  }
  ctx.lineTo(64, 508);
  for (let y = 500; y >= 8; y -= 8) {
    const w = 10 + Math.sin(y * 0.05) * 8 + (y / 512) * 22;
    ctx.lineTo(64 - w, y);
  }
  ctx.closePath();
  ctx.fill();
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
  if (tex.a < 0.35) discard;
  gl_FragColor = tex;
}
`;

function KelpForest({ count }: { count: number }) {
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
    const rand = mulberry32(77);
    for (let i = 0; i < count; i += 1) {
      const a = rand() * Math.PI * 2;
      const r = 4 + rand() * 10;
      const h = 3.2 + rand() * 3.2;
      _dummy.position.set(Math.cos(a) * r, -13.22, -15 + Math.sin(a) * r * 0.8);
      _dummy.rotation.set(0, rand() * Math.PI, 0);
      _dummy.scale.set(0.7 + rand() * 0.5, h, 1);
      _dummy.updateMatrix();
      inst.setMatrixAt(i, _dummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    return () => {
      geo.dispose();
      mat.dispose();
      map.dispose();
    };
  }, [count, geo, map, mat]);
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

export function Wildlife() {
  const school = quality.dof ? 28 : 10;
  return (
    <group>
      <SpeciesSchool url="/models/cute_fish_pack/BlueTang.glb" count={school} home={[1.2, -9.2, -14]} spread={4.5} speed={0.85} size={0.42} />
      <SpeciesSchool url="/models/cute_fish_pack/Clownfish.glb" count={school} home={[-1.6, -10.1, -16]} spread={3.6} speed={0.7} size={0.28} />
      <SpeciesSchool url="/models/cute_fish_pack/YellowTang.glb" count={Math.round(school * 0.7)} home={[2.4, -8.6, -12]} spread={3.2} speed={0.75} size={0.32} />
      <SpeciesSchool url="/models/cute_fish_pack/ParrotFish.glb" count={Math.round(school * 0.45)} home={[-2.2, -11.2, -18]} spread={4} speed={0.6} size={0.48} />
      <SpeciesSchool url="/models/fish_pack/Manta_ray.glb" count={1} home={[0, -8.4, -16]} spread={6} speed={0.55} size={3.4} />
      <SpeciesSchool url="/models/fish_pack/Whale.glb" count={1} home={[0, -18, -20]} spread={8} speed={0.45} size={12} />
      <SpeciesSchool url="/models/fish_pack/Shark.glb" count={1} home={[4, -14, -18]} spread={6} speed={0.7} size={2.8} />
      <KelpForest count={quality.kelp} />
      <Shells />
    </group>
  );
}
