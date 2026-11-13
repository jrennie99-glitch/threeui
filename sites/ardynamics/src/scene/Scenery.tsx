import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { quality } from "../quality";
import { mulberry32 } from "../dive";
import { shared, sceneRefs } from "./shared";
import { physicalSkin, repeat } from "./physical";
import { createArch, createCapital, createDome, createDrum, createFlutedColumn, createStairs } from "./architecture";
import { createBranchCoral } from "./geometries";
import {
  BEAM_FRAG,
  GLASS_VERT,
  GLOW_FRAG,
  VOL_RAY_FRAG,
  VOL_RAY_VERT,
  SAND_FRAG,
  SAND_VERT,
  SKY_FRAG,
  SKY_VERT,
  UFO_VERT,
  WATER_FRAG,
  WATER_VERT,
  CREATURE_FRAG,
  CREATURE_VERT,
} from "./shaders";

function useBind<T>(set: (value: T | null) => void) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    set(ref.current);
    return () => set(null);
  }, [set]);
  return ref;
}

export function Sky() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: shared.uTime, uSunDir: shared.uSunDir },
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    [],
  );
  const ref = useBind<THREE.Mesh>((value) => {
    sceneRefs.sky = value;
  });
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh ref={ref} frustumCulled={false} renderOrder={-2}>
      <sphereGeometry args={[220, 32, 20]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

export function Water({ texture }: { texture: THREE.Texture }) {
  const mat = useMemo(() => {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.uTime,
        uDetail: shared.uDetail,
        uSunDir: shared.uSunDir,
        uScene: { value: texture },
        uHasScene: shared.uHasScene,
        uResolution: shared.uResolution,
        uUnder: shared.uUnder,
        uUfoPos: shared.uUfoPos,
        uFogColor: shared.uFogColor,
        uSky: shared.uSky,
        uHasSky: shared.uHasSky,
      },
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
    });
    sceneRefs.waterMat = material;
    return material;
  }, [texture]);
  const ref = useBind<THREE.Mesh>((value) => {
    sceneRefs.water = value;
  });
  useEffect(() => () => mat.dispose(), [mat]);
  const seg = quality.waterSeg;
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false} renderOrder={2}>
      <planeGeometry args={[quality.waterSize, quality.waterSize, seg, seg]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function Sand({
  position,
  size,
  color,
  city,
}: {
  position: [number, number, number];
  size: number;
  color: string;
  city?: boolean;
}) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: shared.uTime,
          uFogColor: shared.uFogColor,
          uFogDensity: shared.uFogDensity,
          uColor: { value: new THREE.Color(color) },
          uCity: { value: city ? 1 : 0 },
          uCityPos: shared.uCityPos,
        },
        vertexShader: SAND_VERT,
        fragmentShader: SAND_FRAG,
      }),
    [city, color],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false}>
      <circleGeometry args={[size, city ? 64 : 48]} />
      <primitive object={mat} attach="material" />
    </mesh>
  );
}

function PhotoSand() {
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(28, 96);
    const count = g.attributes.position.count;
    g.setAttribute("aTint", new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(count), 1));
    return g;
  }, []);
  const mat = useMemo(
    () => physicalSkin({ sway: 0, color: "#cbb189", roughness: 0.94, metalness: 0, clearcoat: 0.08, clearcoatRoughness: 0.4, sheen: 0.05 }),
    [],
  );
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let alive = true;
    void Promise.all([
      loader.loadAsync("/textures/sand_diff.jpg"),
      loader.loadAsync("/textures/sand_nor.jpg"),
      loader.loadAsync("/textures/sand_rough.jpg"),
    ]).then(([diff, nor, rough]) => {
      if (!alive) return;
      repeat(diff, 14, true);
      repeat(nor, 14);
      repeat(rough, 14);
      mat.map = diff;
      mat.normalMap = nor;
      mat.roughnessMap = rough;
      mat.needsUpdate = true;
    });
    return () => {
      alive = false;
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);
  return <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[0, -13.22, -15]} frustumCulled={false} />;
}

export function Floors() {
  return (
    <>
      <PhotoSand />
      <Sand position={[0, -63.2, 0]} size={24} color="#1c3140" city />
    </>
  );
}

export function GodRays() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: shared.uTime },
        vertexShader: VOL_RAY_VERT,
        fragmentShader: VOL_RAY_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh position={[0, -22, -14]} frustumCulled={false} renderOrder={3} material={mat}>
      <boxGeometry args={[70, 48, 64]} />
    </mesh>
  );
}

export function Spires() {
  const geo = useMemo(() => new THREE.ConeGeometry(0.7, 6.5, 6), []);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: shared.uTime,
          uSway: { value: 0 },
          uShine: { value: 0.08 },
          uAlpha: { value: 1 },
          uFogColor: shared.uFogColor,
          uFogDensity: shared.uFogDensity,
          uSunDir: shared.uSunDir,
          uUfoPos: shared.uUfoPos,
          uCityPos: shared.uCityPos,
        },
        vertexShader: CREATURE_VERT,
        fragmentShader: CREATURE_FRAG,
      }),
    [],
  );
  const mesh = useRef<THREE.InstancedMesh>(null);
  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);
  useLayoutEffect(() => {
    const count = quality.spires;
    const colors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const tint = new THREE.Color("#6d7c86");
    for (let i = 0; i < count; i += 1) {
      colors[i * 3] = tint.r;
      colors[i * 3 + 1] = tint.g;
      colors[i * 3 + 2] = tint.b;
      phases[i] = i;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3));
    geo.setAttribute("aTint", new THREE.InstancedBufferAttribute(colors, 3));
    geo.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
    const rand = mulberry32(41);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i += 1) {
      const a = rand() * Math.PI * 2;
      const r = 22 + rand() * 14;
      const h = 0.8 + rand() * 1.1;
      dummy.position.set(Math.cos(a) * r, -50 - rand() * 6, Math.sin(a) * r);
      dummy.scale.set(0.6 + rand(), h, 0.6 + rand());
      dummy.updateMatrix();
      mesh.current?.setMatrixAt(i, dummy.matrix);
    }
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
  }, [geo]);
  return <instancedMesh ref={mesh} args={[geo, mat, quality.spires]} dispose={null} frustumCulled={false} />;
}

export function Atlantis() {
  const root = useRef<THREE.Group>(null);
  const glass = useMemo(
    () =>
      physicalSkin({
        sway: 0,
        color: "#efe6d6",
        roughness: 0.32,
        metalness: 0.04,
        transmission: 0.06,
        thickness: 0.4,
        ior: 1.5,
        clearcoat: 0.45,
        clearcoatRoughness: 0.18,
        sheen: 0.2,
        sheenColor: "#f4efe4",
      }),
    [],
  );
  const glassWarm = useMemo(
    () =>
      physicalSkin({
        sway: 0,
        color: "#e7d3a1",
        roughness: 0.22,
        metalness: 0.85,
        clearcoat: 0.7,
        clearcoatRoughness: 0.12,
        emissive: "#3a2a10",
        emissiveIntensity: 0.15,
      }),
    [],
  );
  const stone = useMemo(
    () =>
      physicalSkin({
        sway: 0,
        color: "#f4f1ea",
        roughness: 0.42,
        metalness: 0.02,
        clearcoat: 0.35,
        clearcoatRoughness: 0.22,
        sheen: 0.18,
        sheenColor: "#f7f3ea",
      }),
    [],
  );
  const windowMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2a1c10",
        emissive: new THREE.Color("#ffb15a"),
        emissiveIntensity: 2.4,
        roughness: 0.35,
      }),
    [],
  );
  const coralGeo = useMemo(() => createBranchCoral(), []);
  const coralMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#6e5348",
        roughness: 0.62,
        metalness: 0.02,
      }),
    [],
  );
  const crystalMat = useMemo(
    () =>
      physicalSkin({
        sway: 0,
        color: "#e7fbff",
        roughness: 0.04,
        transmission: 0.82,
        thickness: 0.5,
        ior: 1.6,
        emissive: "#7ee8f2",
        emissiveIntensity: 0.65,
        attenuationColor: "#9af6ff",
        attenuationDistance: 0.4,
      }),
    [],
  );
  const orb = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uColor: { value: new THREE.Color("#9af6ff") }, uGain: { value: 2.6 } },
        vertexShader: GLASS_VERT,
        fragmentShader: GLOW_FRAG,
      }),
    [],
  );
  const columnGeo = useMemo(() => createFlutedColumn(4.6, 0.38, 20), []);
  const capitalGeo = useMemo(() => createCapital(), []);
  const stairGeo = useMemo(() => createStairs(8, 7.2), []);
  const domeGeo = useMemo(() => createDome(3.15), []);
  const drumGeo = useMemo(() => createDrum(3.35, 1.6), []);
  const archSpan = 2 * 5.6 * Math.sin(Math.PI / 10);
  const archGeo = useMemo(() => createArch(archSpan), []);
  const crystalGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.28, 3.6, 5);
    g.translate(0, 1.8, 0);
    const n = g.attributes.position.count;
    g.setAttribute("aTint", new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(n), 1));
    return g;
  }, []);
  const columns = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return [Math.cos(a) * 5.6, 2.5, Math.sin(a) * 5.6] as [number, number, number];
      }),
    [],
  );
  useEffect(() => () => {
    glass.dispose();
    glassWarm.dispose();
    stone.dispose();
    orb.dispose();
    crystalMat.dispose();
    windowMat.dispose();
    coralMat.dispose();
    coralGeo.dispose();
    columnGeo.dispose();
    capitalGeo.dispose();
    stairGeo.dispose();
    domeGeo.dispose();
    drumGeo.dispose();
    archGeo.dispose();
    crystalGeo.dispose();
  }, [archGeo, capitalGeo, columnGeo, coralGeo, coralMat, crystalGeo, crystalMat, domeGeo, drumGeo, glass, glassWarm, orb, stairGeo, stone, windowMat]);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let alive = true;
    void Promise.all([
      loader.loadAsync("/textures/marble_diff.jpg"),
      loader.loadAsync("/textures/marble_nor.jpg"),
      loader.loadAsync("/textures/marble_rough.jpg"),
      loader.loadAsync("/textures/gold_diff.jpg"),
      loader.loadAsync("/textures/gold_nor.jpg"),
      loader.loadAsync("/textures/gold_rough.jpg"),
      loader.loadAsync("/textures/gold_metal.jpg"),
    ]).then(([diff, nor, rough, gold, goldNor, goldRough, goldMetal]) => {
      if (!alive) return;
      repeat(diff, 1.6, true);
      repeat(nor, 1.6);
      repeat(rough, 1.6);
      stone.map = diff;
      stone.normalMap = nor;
      stone.roughnessMap = rough;
      stone.normalScale.set(1.15, 1.15);
      stone.color.set("#ffffff");
      stone.roughness = 0.46;
      stone.envMapIntensity = 1.35;
      stone.needsUpdate = true;
      glass.map = diff;
      glass.normalMap = nor;
      glass.roughnessMap = rough;
      glass.normalScale.set(0.8, 0.8);
      glass.color.set("#f7f4ee");
      glass.envMapIntensity = 1.2;
      glass.needsUpdate = true;
      repeat(gold, 2, true);
      repeat(goldNor, 2);
      repeat(goldRough, 2);
      repeat(goldMetal, 2);
      glassWarm.map = gold;
      glassWarm.normalMap = goldNor;
      glassWarm.roughnessMap = goldRough;
      glassWarm.metalnessMap = goldMetal;
      glassWarm.metalness = 1;
      glassWarm.roughness = 0.32;
      glassWarm.color.set("#fff4d2");
      glassWarm.envMapIntensity = 1.8;
      glassWarm.needsUpdate = true;
    });
    return () => {
      alive = false;
    };
  }, [glass, glassWarm, stone]);
  useLayoutEffect(() => {
    stampSkin(root.current);
  }, []);
  return (
    <group ref={root} position={[0, -63.2, 0]}>
      <ambientLight color="#d5e7f4" intensity={0.07} />
      <hemisphereLight color="#d5eaff" groundColor="#142838" intensity={0.1} />
      <pointLight position={[0, 9.4, 1.5]} intensity={180} distance={28} decay={2} color="#ffe4bf" />
      <pointLight position={[5.5, 3.2, 6]} intensity={70} distance={16} decay={2} color="#9adfff" />
      <pointLight position={[-4.5, 3.4, 5]} intensity={55} distance={14} decay={2} color="#ffc48a" />
      <mesh material={stone} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[14, 72]} />
      </mesh>
      <mesh material={stone} position={[0, 0.28, 0]}>
        <cylinderGeometry args={[6.5, 7.1, 0.5, 48]} />
      </mesh>
      <mesh geometry={stairGeo} material={stone} position={[0, 0.2, 5.6]} dispose={null} />
      <mesh geometry={drumGeo} material={stone} position={[0, 5.5, 0]} dispose={null} />
      <mesh geometry={domeGeo} material={glass} position={[0, 6.5, 0]} dispose={null} />
      <mesh material={glassWarm} position={[0, 6.28, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.22, 0.14, 16, 72]} />
      </mesh>
      <mesh material={glassWarm} position={[0, 4.65, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[3.42, 0.07, 12, 64]} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <mesh key={`win-${i}`} material={windowMat} position={[Math.cos(a) * 3.48, 5.55, Math.sin(a) * 3.48]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.34, 0.78, 0.1]} />
          </mesh>
        );
      })}
      {columns.map((p, i) => (
        <group key={i} position={p}>
          <mesh geometry={columnGeo} material={stone} dispose={null} />
          <mesh geometry={capitalGeo} material={glassWarm} position={[0, 2.45, 0]} dispose={null} />
          <mesh material={glassWarm} position={[0, 2.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.46, 0.045, 8, 24]} />
          </mesh>
          <mesh geometry={coralGeo} material={coralMat} position={[0.55, -2.15, 0.2]} rotation={[0.4, i * 0.7, 0.2]} scale={0.42} />
        </group>
      ))}
      {[0, 2, 4, 6, 8].map((i) => {
        const a = (i / 10) * Math.PI * 2 + Math.PI / 10;
        const mid = 5.6 * Math.cos(Math.PI / 10);
        return (
          <mesh
            key={`arch-${i}`}
            geometry={archGeo}
            material={stone}
            position={[Math.cos(a) * mid, 5.2, Math.sin(a) * mid]}
            rotation={[0, -a, 0]}
            dispose={null}
          />
        );
      })}
      {columns.map((p, i) => {
        const len = Math.hypot(p[0], p[2]) || 1;
        return (
          <mesh
            key={`crystal-${i}`}
            geometry={crystalGeo}
            material={crystalMat}
            position={[(p[0] / len) * 7.6, 0.05, (p[2] / len) * 7.6]}
            dispose={null}
          />
        );
      })}
      <mesh material={orb} position={[0, 9.55, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
      </mesh>
    </group>
  );
}

export function Ufo() {
  const group = useRef<THREE.Group>(null);
  const hullMat = useMemo(() => ufoMaterial(0), []);
  const domeMat = useMemo(() => ufoMaterial(1), []);
  const lampMat = useMemo(() => ufoMaterial(2), []);
  const beamMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: shared.uTime },
        vertexShader: UFO_VERT,
        fragmentShader: BEAM_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const hullGeo = useMemo(() => {
    const pts = [
      new THREE.Vector2(0.02, 0.2),
      new THREE.Vector2(0.42, 0.3),
      new THREE.Vector2(0.95, 0.2),
      new THREE.Vector2(1.38, 0.07),
      new THREE.Vector2(1.74, -0.02),
      new THREE.Vector2(1.62, -0.11),
      new THREE.Vector2(1.12, -0.17),
      new THREE.Vector2(0.48, -0.12),
      new THREE.Vector2(0.02, -0.06),
    ];
    const g = new THREE.LatheGeometry(pts, 72);
    const n = g.attributes.position.count;
    g.setAttribute("aTint", new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(n), 1));
    return g;
  }, []);
  useEffect(() => () => {
    hullMat.dispose();
    domeMat.dispose();
    lampMat.dispose();
    beamMat.dispose();
    hullGeo.dispose();
  }, [beamMat, domeMat, hullGeo, hullMat, lampMat]);
  useLayoutEffect(() => {
    stampSkin(group.current);
  }, []);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.position.copy(shared.uUfoPos.value);
    g.rotation.y = shared.uTime.value * 0.35;
    g.scale.setScalar(1.55);
  }, -9);
  const lights = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  const beamDust = useMemo(() => {
    const data = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i += 1) {
      const y = (i / 180) * -9;
      const r = (1 - i / 180) * 1.3 * Math.random();
      const a = Math.random() * Math.PI * 2;
      data[i * 3] = Math.cos(a) * r;
      data[i * 3 + 1] = y;
      data[i * 3 + 2] = Math.sin(a) * r;
    }
    return data;
  }, []);
  return (
    <group ref={group}>
      <mesh geometry={hullGeo} material={hullMat} />
      <mesh material={hullMat} position={[0, 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.02, 8, 48]} />
      </mesh>
      <mesh material={hullMat} position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.52, 0.018, 8, 56]} />
      </mesh>
      <mesh material={hullMat} position={[0, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.22, 0.016, 8, 48]} />
      </mesh>
      <mesh material={lampMat} position={[0, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.7, 0.028, 8, 64]} />
      </mesh>
      <mesh material={domeMat} position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.62, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {lights.map((i) => {
        const a = (i / lights.length) * Math.PI * 2;
        return (
          <mesh key={i} material={lampMat} position={[Math.cos(a) * 1.48, 0.04, Math.sin(a) * 1.48]}>
            <sphereGeometry args={[0.055, 10, 8]} />
          </mesh>
        );
      })}
      <mesh material={beamMat} position={[0, -5.4, 0]}>
        <coneGeometry args={[1.85, 10.4, 28, 1, true]} />
      </mesh>
      <mesh material={beamMat} position={[0, -5.1, 0]}>
        <coneGeometry args={[0.55, 9.6, 16, 1, true]} />
      </mesh>
      <points position={[0, -5.5, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[beamDust, 3]} />
        </bufferGeometry>
        <pointsMaterial color="#d7fbff" size={0.07} transparent opacity={0.85} depthWrite={false} />
      </points>
    </group>
  );
}

function panelNormal(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("panel normal");
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sx = x % 64;
      const sy = y % 40;
      let dx = 0;
      let dy = 0;
      if (sx < 2) dx = -0.95;
      else if (sx > 61) dx = 0.95;
      if (sy < 2) dy = -0.8;
      const rivet = sx > 8 && sx < 15 && sy > 8 && sy < 15;
      if (rivet) {
        dx += (sx - 11.5) / 3.2;
        dy += (sy - 11.5) / 3.2;
      }
      const i = (y * size + x) * 4;
      image.data[i] = Math.max(0, Math.min(255, 128 + dx * 72));
      image.data[i + 1] = Math.max(0, Math.min(255, 128 + dy * 72));
      image.data[i + 2] = 255;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 3);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function ufoMaterial(kind: number): THREE.Material {
  if (kind === 0) {
    const hull = physicalSkin({
      sway: 0,
      color: "#d5dbe2",
      metalness: 0.96,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      sheen: 0,
    });
    hull.normalMap = panelNormal();
    hull.normalScale.set(0.35, 0.35);
    return hull;
  }
  if (kind === 1) {
    return physicalSkin({
      sway: 0,
      color: "#e7fbff",
      metalness: 0,
      roughness: 0.04,
      transmission: quality.dof ? 0.94 : 0.2,
      thickness: 0.4,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      attenuationColor: "#b7f3ff",
      attenuationDistance: 0.8,
    });
  }
  return physicalSkin({
    sway: 0,
    color: "#021018",
    emissive: "#b8f6ff",
    emissiveIntensity: 8,
    roughness: 0.25,
    metalness: 0.2,
    clearcoat: 0.4,
  });
}

function stampSkin(root: THREE.Object3D | null): void {
  root?.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry;
    if (!geo.getAttribute("aTint")) {
      const count = geo.attributes.position.count;
      geo.setAttribute("aTint", new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));
      geo.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(count), 1));
    }
  });
}
