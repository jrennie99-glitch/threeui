import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { dive, mulberry32, pointerActive } from "../dive";
import { quality } from "../quality";
import {
  createBirdGeometry,
  createBrainCoral,
  createBranchCoral,
  createBubbleGeometry,
  createFanCoral,
  createFishGeometry,
  createJellyBell,
  createKelpGeometry,
  createMantaGeometry,
  createRockGeometry,
  createTentacle,
  createWhaleGeometry,
} from "./geometries";
import { BUBBLE_FRAG, BUBBLE_VERT, PLANKTON_FRAG, PLANKTON_VERT } from "./shaders";
import { shared } from "./shared";
import { getScaleNormal, physicalSkin, repeat } from "./physical";

const _dummy = new THREE.Object3D();
const _child = new THREE.Object3D();
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

function creatureMaterial(sway: number, shine: number, side: THREE.Side = THREE.FrontSide): THREE.MeshPhysicalMaterial {
  const material = physicalSkin({
    sway,
    roughness: THREE.MathUtils.lerp(0.55, 0.18, shine),
    clearcoat: 0.25 + shine * 0.55,
    clearcoatRoughness: 0.22 - shine * 0.1,
    sheen: 0.15 + shine * 0.35,
    side,
    vertexColors: true,
  });
  if (sway === 1 || sway === 4 || sway === 3) {
    material.normalMap = getScaleNormal();
    material.normalScale.set(sway === 1 ? 0.65 : 0.28, sway === 1 ? 0.65 : 0.28);
  }
  return material;
}

function stamp(geo: THREE.BufferGeometry, count: number, tints: string[], seed: number): void {
  const rand = mulberry32(seed);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    color.set(tints[i % tints.length]);
    color.offsetHSL((rand() - 0.5) * 0.06, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.1);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    phases[i] = rand() * Math.PI * 2;
  }
  geo.setAttribute("aTint", new THREE.InstancedBufferAttribute(colors, 3));
  geo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
}

type Boid = { p: THREE.Vector3; v: THREE.Vector3; phase: number; scale: number };

function School({
  base,
  count,
  seed,
  home,
  spread,
  speed,
  tints,
  shine,
  sway,
  scale,
  side,
}: {
  base: THREE.BufferGeometry;
  count: number;
  seed: number;
  home: [number, number, number];
  spread: number;
  speed: number;
  tints: string[];
  shine: number;
  sway: number;
  scale: number;
  side?: THREE.Side;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const next = base.clone();
    stamp(next, count, tints, seed);
    return next;
  }, [base, count, seed, tints]);
  const mat = useMemo(() => creatureMaterial(sway, shine, side ?? THREE.FrontSide), [sway, shine, side]);
  const boids = useMemo<Boid[]>(() => {
    const rand = mulberry32(seed + 99);
    return Array.from({ length: count }, (_, i) => ({
      p: new THREE.Vector3(
        home[0] + (rand() - 0.5) * spread * 2,
        home[1] + (rand() - 0.5) * spread * 0.7,
        home[2] + (rand() - 0.5) * spread * 2,
      ),
      v: new THREE.Vector3(rand() - 0.5, (rand() - 0.5) * 0.15, rand() - 0.5).normalize().multiplyScalar(speed),
      phase: (geo.getAttribute("aPhase") as THREE.BufferAttribute).getX(i),
      scale: scale * (0.72 + rand() * 0.55),
    }));
  }, [count, geo, home, scale, seed, speed, spread]);
  const anchor = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    boids.forEach((b, i) => {
      _dummy.position.copy(b.p);
      _dummy.scale.setScalar(b.scale);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [boids]);

  const { camera } = useThree();
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = dive.dt;
    anchor.set(
      home[0] + Math.sin(dive.time * 0.13 + seed) * 1.5,
      home[1] + Math.sin(dive.time * 0.23 + seed) * 0.3,
      home[2] + Math.cos(dive.time * 0.11 + seed) * 1.6,
    );
    let ray: THREE.Ray | null = null;
    if (pointerActive()) {
      _ndc.set(dive.pointerX, dive.pointerY);
      _raycaster.setFromCamera(_ndc, camera);
      ray = _raycaster.ray;
    }
    for (let i = 0; i < boids.length; i += 1) {
      const b = boids[i];
      _sep.set(0, 0, 0);
      _ali.set(0, 0, 0);
      _coh.set(0, 0, 0);
      let nSep = 0;
      let n = 0;
      for (let j = 0; j < boids.length; j += 1) {
        if (i === j) continue;
        const dist = b.p.distanceTo(boids[j].p);
        if (dist < 0.9 && dist > 1e-4) {
          _sep.add(_tmp.copy(b.p).sub(boids[j].p).multiplyScalar(1 / dist));
          nSep += 1;
        }
        if (dist < 2.5) {
          _ali.add(boids[j].v);
          _coh.add(boids[j].p);
          n += 1;
        }
      }
      _steer.set(0, 0, 0);
      if (nSep) _steer.add(_sep.multiplyScalar(1.5));
      if (n) {
        _ali.multiplyScalar(1 / n);
        _steer.add(_ali.sub(b.v).multiplyScalar(0.55));
        _coh.multiplyScalar(1 / n);
        _steer.add(_tmp.copy(_coh).sub(b.p).multiplyScalar(0.32));
      }
      _tmp.copy(anchor).sub(b.p);
      if (_tmp.length() > spread) _steer.add(_tmp.multiplyScalar(0.85));
      if (Math.abs(b.p.y - anchor.y) > spread * 0.4) _steer.y += (anchor.y - b.p.y) * 1.5;
      if (ray) {
        const t = _tmp.copy(b.p).sub(ray.origin).dot(ray.direction);
        if (t > 0 && t < 22) {
          _closest.copy(ray.origin).addScaledVector(ray.direction, t);
          const d = _closest.distanceTo(b.p);
          if (d < 2.5) _steer.add(_tmp.copy(b.p).sub(_closest).multiplyScalar((2.5 - d) * 3.4));
        }
      }
      _steer.x += Math.sin(dive.time * 0.8 + b.phase) * 0.12;
      _steer.z += Math.cos(dive.time * 0.63 + b.phase) * 0.12;
      b.v.addScaledVector(_steer, dt);
      if (b.v.length() > speed) b.v.setLength(speed);
      b.p.addScaledVector(b.v, dt);
      _dummy.position.copy(b.p);
      _dir.copy(b.v).normalize();
      _dummy.quaternion.setFromUnitVectors(_forward, _dir);
      _dummy.scale.setScalar(b.scale);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, -8);

  return <instancedMesh ref={ref} args={[geo, mat, count]} dispose={null} frustumCulled={false} />;
}

function Place({
  geo,
  mat,
  count,
  seed,
  tints,
  place,
}: {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  count: number;
  seed: number;
  tints: string[];
  place: (i: number, rand: () => number, dummy: THREE.Object3D) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const local = useMemo(() => {
    const next = geo.clone();
    stamp(next, count, tints, seed);
    return next;
  }, [geo, count, seed, tints]);
  useEffect(() => () => local.dispose(), [local]);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const rand = mulberry32(seed);
    for (let i = 0; i < count; i += 1) {
      place(i, rand, _dummy);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, place, seed]);
  return <instancedMesh ref={ref} args={[local, mat, count]} dispose={null} frustumCulled={false} />;
}

function Flyers({ geo, mat, count, radius, y, speed }: { geo: THREE.BufferGeometry; mat: THREE.Material; count: number; radius: number; y: number; speed: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const local = useMemo(() => {
    const next = geo.clone();
    stamp(next, count, ["#f7f4ee", "#d7cbb8"], 21);
    return next;
  }, [geo, count]);
  useEffect(() => () => local.dispose(), [local]);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < count; i += 1) {
      const a = dive.time * speed + (i / count) * Math.PI * 2;
      const rr = radius * (0.75 + (i % 3) * 0.18);
      _dummy.position.set(Math.cos(a) * rr, y + Math.sin(a * 2 + i) * 0.7, Math.sin(a) * rr * 0.72 - 2);
      _dir.set(-Math.sin(a), 0, Math.cos(a)).normalize();
      _dummy.quaternion.setFromUnitVectors(_forward, _dir);
      _dummy.scale.setScalar(0.42 + (i % 4) * 0.08);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, -8);
  return <instancedMesh ref={ref} args={[local, mat, count]} dispose={null} frustumCulled={false} />;
}

function Cruiser({
  geo,
  mat,
  path,
  scale,
}: {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  scale: number;
  path: (time: number, pos: THREE.Vector3, dir: THREE.Vector3) => void;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const local = useMemo(() => {
    const next = geo.clone();
    stamp(next, 1, ["#ffffff"], 4);
    return next;
  }, [geo]);
  useEffect(() => () => local.dispose(), [local]);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    path(dive.time, _dummy.position, _dir);
    if (_dir.lengthSq() < 1e-6) _dir.set(0, 0, 1);
    _dir.normalize();
    _dummy.quaternion.setFromUnitVectors(_forward, _dir);
    _dummy.scale.setScalar(scale);
    _dummy.updateMatrix();
    mesh.setMatrixAt(0, _dummy.matrix);
    mesh.instanceMatrix.needsUpdate = true;
  }, -8);
  return <instancedMesh ref={ref} args={[local, mat, 1]} dispose={null} frustumCulled={false} />;
}

function Jellies({ count }: { count: number }) {
  const bellGeo = useMemo(() => createJellyBell(), []);
  const tentGeo = useMemo(() => createTentacle(), []);
  const tentacles = 5;
  const homes = useMemo(() => {
    const rand = mulberry32(11);
    return Array.from({ length: count }, () => {
      const a = rand() * Math.PI * 2;
      const r = 4.5 + rand() * 8;
      return new THREE.Vector3(Math.cos(a) * r, -7 - rand() * 34, -8 - rand() * 16);
    });
  }, [count]);
  const bell = useMemo(() => {
    const g = bellGeo.clone();
    const tints = ["#7cf0ff", "#d9a6ff", "#9af7d8", "#f2c6ff"];
    stamp(g, count, tints, 12);
    return g;
  }, [bellGeo, count]);
  const tents = useMemo(() => {
    const g = tentGeo.clone();
    stamp(g, count * tentacles, ["#8ae7ff", "#e2b6ff"], 13);
    return g;
  }, [tentGeo, count]);
  const bellMat = useMemo(
    () =>
      physicalSkin({
        sway: 6,
        roughness: 0.08,
        clearcoat: 0.85,
        clearcoatRoughness: 0.08,
        transmission: quality.dof ? 0.92 : 0,
        thickness: 0.55,
        ior: 1.35,
        attenuationColor: "#8ef6ff",
        attenuationDistance: 0.9,
        emissive: "#146878",
        emissiveIntensity: 0.55,
        opacity: quality.dof ? 1 : 0.55,
        side: THREE.DoubleSide,
        sheen: 0.6,
        sheenColor: "#d8fbff",
      }),
    [],
  );
  const tentMat = useMemo(
    () =>
      physicalSkin({
        sway: 7,
        roughness: 0.22,
        clearcoat: 0.4,
        transmission: quality.dof ? 0.55 : 0,
        thickness: 0.15,
        ior: 1.33,
        attenuationColor: "#c9b6ff",
        attenuationDistance: 0.6,
        emissive: "#3a2060",
        emissiveIntensity: 0.35,
        opacity: quality.dof ? 1 : 0.4,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const bellRef = useRef<THREE.InstancedMesh>(null);
  const tentRef = useRef<THREE.InstancedMesh>(null);
  useEffect(() => () => {
    bell.dispose();
    tents.dispose();
    bellGeo.dispose();
    tentGeo.dispose();
    bellMat.dispose();
    tentMat.dispose();
  }, [bell, bellGeo, bellMat, tentGeo, tentMat, tents]);
  useFrame(() => {
    const bMesh = bellRef.current;
    const tMesh = tentRef.current;
    if (!bMesh || !tMesh) return;
    homes.forEach((home, i) => {
      const bob = Math.sin(dive.time * 0.4 + i) * 0.45;
      _dummy.position.set(home.x + Math.sin(dive.time * 0.2 + i) * 0.6, home.y + bob, home.z);
      _dummy.rotation.set(0, dive.time * 0.15 + i, 0);
      _dummy.scale.setScalar(0.85 + (i % 3) * 0.18);
      _dummy.updateMatrix();
      bMesh.setMatrixAt(i, _dummy.matrix);
      for (let k = 0; k < tentacles; k += 1) {
        const ang = (k / tentacles) * Math.PI * 2 + i;
        _tmp.set(Math.cos(ang) * 0.16, -0.35, Math.sin(ang) * 0.16);
        _tmp.applyQuaternion(_dummy.quaternion);
        _closest.copy(_dummy.position).add(_tmp);
        _dir.set(0, -1, 0);
        _child.position.copy(_closest);
        _child.quaternion.copy(_dummy.quaternion);
        _child.scale.set(1, 1, 1);
        _child.updateMatrix();
        tMesh.setMatrixAt(i * tentacles + k, _child.matrix);
      }
    });
    bMesh.instanceMatrix.needsUpdate = true;
    tMesh.instanceMatrix.needsUpdate = true;
  }, -8);
  return (
    <>
      <instancedMesh ref={bellRef} args={[bell, bellMat, count]} dispose={null} frustumCulled={false} />
      <instancedMesh ref={tentRef} args={[tents, tentMat, count * tentacles]} dispose={null} frustumCulled={false} />
    </>
  );
}

function Bubbles({ count }: { count: number }) {
  const geo = useMemo(() => {
    const g = createBubbleGeometry();
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i += 1) phases[i] = Math.random() * 6;
    g.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
    return g;
  }, [count]);
  const mat = useMemo(
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
    return Array.from({ length: count }, () => ({
      p: new THREE.Vector3((rand() - 0.5) * 18, -rand() * 24, -rand() * 20),
      s: 0.04 + rand() * 0.08,
      v: 0.35 + rand() * 0.7,
    }));
  }, [count]);
  const ref = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();
  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const cam = camera.position;
    for (let i = 0; i < parts.length; i += 1) {
      const b = parts[i];
      b.p.y += dive.dt * b.v;
      if (cam.y < 1) {
        if (b.p.y > Math.min(0.2, cam.y + 4)) {
          b.p.set(cam.x + (Math.random() - 0.5) * 8, cam.y - 2 - Math.random() * 8, cam.z - 1.5 - Math.random() * 10);
        }
      } else if (b.p.y > 0.15) {
        b.p.set((Math.random() - 0.5) * 20, -6 - Math.random() * 18, -6 - Math.random() * 16);
      }
      _dummy.position.copy(b.p);
      _dummy.scale.setScalar(b.s);
      _dummy.rotation.set(0, 0, 0);
      _dummy.updateMatrix();
      mesh.setMatrixAt(i, _dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, -8);
  return <instancedMesh ref={ref} args={[geo, mat, count]} dispose={null} frustumCulled={false} />;
}

function Plankton({ count }: { count: number }) {
  const geo = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const kinds = new Float32Array(count);
    const rand = mulberry32(23);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = (rand() - 0.5) * 40;
      positions[i * 3 + 1] = (rand() - 0.5) * 40;
      positions[i * 3 + 2] = (rand() - 0.5) * 40;
      sizes[i] = 1.4 + rand() * 3.2;
      kinds[i] = rand();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    g.setAttribute("aKind", new THREE.BufferAttribute(kinds, 1));
    return g;
  }, [count]);
  const mat = useMemo(
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
  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

export function Life() {
  const q = quality;
  const fish = useMemo(() => createFishGeometry(), []);
  const kelp = useMemo(() => createKelpGeometry(), []);
  const brain = useMemo(() => createBrainCoral(), []);
  const branch = useMemo(() => createBranchCoral(), []);
  const fan = useMemo(() => createFanCoral(), []);
  const rock = useMemo(() => createRockGeometry(), []);
  const manta = useMemo(() => createMantaGeometry(), []);
  const whale = useMemo(() => createWhaleGeometry(), []);
  const bird = useMemo(() => createBirdGeometry(), []);
  const kelpMat = useMemo(() => creatureMaterial(2, 0.05, THREE.DoubleSide), []);
  const coralMat = useMemo(() => creatureMaterial(0, 0.12), []);
  const rockMat = useMemo(() => creatureMaterial(0, 0.08), []);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let alive = true;
    void Promise.all([
      loader.loadAsync("/textures/rock_diff.jpg"),
      loader.loadAsync("/textures/rock_nor.jpg"),
      loader.loadAsync("/textures/rock_arm.jpg"),
    ]).then(([diff, nor, arm]) => {
      if (!alive) return;
      repeat(diff, 1.6, true);
      repeat(nor, 1.6);
      repeat(arm, 1.6);
      rockMat.map = diff;
      rockMat.normalMap = nor;
      rockMat.roughnessMap = arm;
      rockMat.metalness = 0.04;
      rockMat.roughness = 0.92;
      rockMat.needsUpdate = true;
      coralMat.map = diff;
      coralMat.normalMap = nor;
      coralMat.normalScale.set(0.85, 0.85);
      coralMat.roughness = 0.78;
      coralMat.clearcoat = 0.12;
      coralMat.needsUpdate = true;
    });
    return () => {
      alive = false;
    };
  }, [coralMat, rockMat]);
  const mantaMat = useMemo(() => creatureMaterial(3, 0.62, THREE.DoubleSide), []);
  const whaleMat = useMemo(() => creatureMaterial(4, 0.46), []);
  const birdMat = useMemo(() => creatureMaterial(5, 0.22, THREE.DoubleSide), []);
  useEffect(() => () => {
    [fish, kelp, brain, branch, fan, rock, manta, whale, bird].forEach((g) => g.dispose());
    [kelpMat, coralMat, rockMat, mantaMat, whaleMat, birdMat].forEach((m) => m.dispose());
  }, [bird, birdMat, brain, branch, coralMat, fan, fish, kelp, kelpMat, manta, mantaMat, rock, rockMat, whale, whaleMat]);

  const placeKelp = (i: number, rand: () => number, dummy: THREE.Object3D) => {
    const a = rand() * Math.PI * 2;
    const r = 5.5 + rand() * 9;
    const h = 3.2 + rand() * 3.4;
    dummy.position.set(Math.cos(a) * r, -13.2 + h * 0.5, -15 + Math.sin(a) * r * 0.75);
    dummy.rotation.set(0, rand() * Math.PI, 0);
    dummy.scale.set(0.7 + rand() * 0.6, h, 1);
    void i;
  };
  const placeCoral = (spread: number) => (i: number, rand: () => number, dummy: THREE.Object3D) => {
    const a = (i / Math.max(1, spread)) * Math.PI * 2 + rand();
    const r = 1.2 + rand() * 8;
    const s = 0.45 + rand() * 0.9;
    dummy.position.set(Math.cos(a) * r, -13.2 + s * 0.15, -15 + Math.sin(a) * r * 0.8);
    dummy.rotation.set(0, rand() * 6, 0);
    dummy.scale.setScalar(s);
  };
  const placeRock = (i: number, rand: () => number, dummy: THREE.Object3D) => {
    const a = rand() * Math.PI * 2;
    const r = 2 + rand() * 11;
    const s = 0.5 + rand() * 1.3;
    dummy.position.set(Math.cos(a) * r, -13.15, -15 + Math.sin(a) * r * 0.85);
    dummy.rotation.set(rand(), rand(), rand());
    dummy.scale.set(s, s * 0.7, s);
    void i;
  };

  return (
    <group>
      <School base={fish} count={q.fish[0]} seed={1} home={[1.2, -9.1, -13.5]} spread={4.2} speed={1.25} tints={["#c9b89a", "#d5d0c4", "#8f9e96"]} shine={0.86} sway={1} scale={1} />
      <School base={fish} count={q.fish[1]} seed={2} home={[-2.4, -10.2, -16]} spread={3.8} speed={1.45} tints={["#6e8f98", "#8aa3a8", "#b7c4c2"]} shine={0.92} sway={1} scale={0.82} />
      <School base={fish} count={q.fish[2]} seed={3} home={[5, -18, -22]} spread={6.5} speed={0.9} tints={["#c5ccc8", "#aeb8b4", "#d9cbb8"]} shine={0.7} sway={1} scale={1.7} />
      <Place geo={kelp} mat={kelpMat} count={q.kelp} seed={7} tints={["#d8f3dc", "#95d5b2", "#f0d48a"]} place={placeKelp} />
      <Place geo={brain} mat={coralMat} count={Math.ceil(q.coral * 0.34)} seed={8} tints={["#c4846a", "#d7b48a", "#a86858"]} place={placeCoral(q.coral)} />
      <Place geo={branch} mat={coralMat} count={Math.ceil(q.coral * 0.4)} seed={9} tints={["#c46a5c", "#d9a07a", "#e4c4b0"]} place={placeCoral(q.coral)} />
      <Place geo={fan} mat={coralMat} count={Math.max(4, Math.floor(q.coral * 0.26))} seed={10} tints={["#8d6e86", "#6d8494", "#c4989a"]} place={placeCoral(q.coral)} />
      <Place geo={rock} mat={rockMat} count={q.rocks} seed={14} tints={["#8d7b6a", "#6e6258", "#b08968"]} place={placeRock} />
      <Cruiser
        geo={manta}
        mat={mantaMat}
        scale={1}
        path={(time, pos, dir) => {
          const a = time * 0.18;
          pos.set(Math.cos(a) * 7.2, -8.7 + Math.sin(a * 2) * 0.25, -15 + Math.sin(a) * 4.6);
          dir.set(-Math.sin(a), 0, Math.cos(a));
        }}
      />
      <Cruiser
        geo={whale}
        mat={whaleMat}
        scale={1.45}
        path={(time, pos, dir) => {
          const x = Math.sin(time * 0.11) * 16;
          pos.set(x, -17.4 + Math.sin(time * 0.27) * 0.35, -18);
          dir.set(Math.cos(time * 0.11), 0, 0.001);
        }}
      />
      <Flyers geo={bird} mat={birdMat} count={q.birds} radius={22} y={13.5} speed={0.12} />
      <Jellies count={q.jellies} />
      <Bubbles count={q.bubbles} />
      <Plankton count={q.plankton} />
    </group>
  );
}
