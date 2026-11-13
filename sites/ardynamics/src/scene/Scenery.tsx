import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { quality } from "../quality";
import { mulberry32 } from "../dive";
import { shared, sceneRefs } from "./shared";
import { physicalSkin, repeat } from "./physical";
import {
  BEAM_FRAG,
  GLASS_VERT,
  GLOW_FRAG,
  GLYPH_FRAG,
  GLYPH_VERT,
  RAY_FRAG,
  RAY_VERT,
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
        vertexShader: RAY_VERT,
        fragmentShader: RAY_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const planes = useMemo(() => {
    const rand = mulberry32(31);
    return Array.from({ length: quality.rays }, (_, i) => ({
      position: [(i - quality.rays / 2) * 3.2 + (rand() - 0.5) * 2, -8 - (i % 3) * 4, -10 - i * 1.6] as [number, number, number],
      rotation: [ -0.15, (rand() - 0.5) * 0.5, 0] as [number, number, number],
      scale: [3.2 + rand() * 1.4, 16 + rand() * 6, 1] as [number, number, number],
    }));
  }, []);
  return (
    <group>
      {planes.map((p, i) => (
        <mesh key={i} position={p.position} rotation={p.rotation} scale={p.scale} frustumCulled={false} renderOrder={3}>
          <planeGeometry args={[1, 1]} />
          <primitive object={mat} attach="material" />
        </mesh>
      ))}
    </group>
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
        color: "#d9f7ff",
        roughness: 0.05,
        metalness: 0.02,
        transmission: quality.dof ? 0.9 : 0.25,
        thickness: 0.6,
        ior: 1.45,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        attenuationColor: "#7ee7ff",
        attenuationDistance: 1.2,
        emissive: "#083848",
        emissiveIntensity: 0.25,
      }),
    [],
  );
  const glassWarm = useMemo(
    () =>
      physicalSkin({
        sway: 0,
        color: "#ffe6c4",
        roughness: 0.06,
        transmission: quality.dof ? 0.88 : 0.2,
        thickness: 0.5,
        ior: 1.45,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        attenuationColor: "#ffd39a",
        attenuationDistance: 1.1,
        emissive: "#3a2410",
        emissiveIntensity: 0.2,
      }),
    [],
  );
  const glyph = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: shared.uTime,
          uFogColor: shared.uFogColor,
          uFogDensity: shared.uFogDensity,
        },
        vertexShader: GLYPH_VERT,
        fragmentShader: GLYPH_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const stone = useMemo(
    () =>
      physicalSkin({
        sway: 0,
        color: "#8e97a0",
        roughness: 0.62,
        metalness: 0.08,
        clearcoat: 0.2,
        clearcoatRoughness: 0.3,
        vertexColors: true,
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
  const stoneGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.28, 0.34, 3.2, 24);
    const n = g.attributes.position.count;
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3).fill(0.75), 3));
    g.setAttribute("aTint", new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    g.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(n), 1));
    return g;
  }, []);
  useEffect(() => () => {
    glass.dispose();
    glassWarm.dispose();
    glyph.dispose();
    stone.dispose();
    orb.dispose();
    stoneGeo.dispose();
  }, [glass, glassWarm, glyph, orb, stone, stoneGeo]);

  const domes = useMemo(() => {
    const rand = mulberry32(51);
    const list: { p: [number, number, number]; r: number; warm: boolean }[] = [
      { p: [0, 2.3, 0], r: 3.6, warm: false },
    ];
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + 0.35;
      list.push({
        p: [Math.cos(a) * 8.2, 1.15 + rand() * 0.4, Math.sin(a) * 8.2],
        r: 1.35 + rand() * 0.7,
        warm: i % 2 === 0,
      });
    }
    return list;
  }, []);
  const pillars = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return [Math.cos(a) * 5.4, 1.6, Math.sin(a) * 5.4] as [number, number, number];
    });
  }, []);

  useLayoutEffect(() => {
    stampSkin(root.current);
  }, []);
  return (
    <group ref={root} position={[0, -63.2, 0]}>
      {domes.map((d, i) => (
        <group key={i} position={d.p}>
          <mesh material={d.warm ? glassWarm : glass}>
            <sphereGeometry args={[d.r, 28, 16]} />
          </mesh>
          <mesh material={glyph} position={[0, d.r * 0.15, 0]}>
            <cylinderGeometry args={[d.r * 1.02, d.r * 1.02, d.r * 0.85, 20, 1, true]} />
          </mesh>
        </group>
      ))}
      {pillars.map((p, i) => (
        <mesh key={i} geometry={stoneGeo} material={stone} position={p} dispose={null} />
      ))}
      <mesh material={glyph} position={[0, 4.2, 0]}>
        <boxGeometry args={[0.7, 5.4, 0.12]} />
      </mesh>
      <mesh material={glyph} position={[2.2, 2.4, -1.4]} rotation={[0, 0.6, 0]}>
        <boxGeometry args={[0.45, 3.2, 0.1]} />
      </mesh>
      <mesh material={glyph} position={[-2.4, 2.2, 1.2]} rotation={[0, -0.4, 0]}>
        <boxGeometry args={[0.4, 2.8, 0.1]} />
      </mesh>
      <mesh material={orb} position={[0, 7.3, 0]}>
        <sphereGeometry args={[0.28, 16, 16]} />
      </mesh>
      <mesh position={[0, 7.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.55, 0.025, 8, 24]} />
        <primitive object={orb} attach="material" />
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
    const g = new THREE.SphereGeometry(1.65, 32, 16);
    g.scale(1, 0.3, 1);
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
  return (
    <group ref={group}>
      <mesh geometry={hullGeo} material={hullMat} />
      <mesh material={hullMat} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.7, 0.085, 12, 40]} />
      </mesh>
      <mesh material={domeMat} position={[0, 0.28, 0]}>
        <sphereGeometry args={[0.7, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </mesh>
      {lights.map((i) => {
        const a = (i / lights.length) * Math.PI * 2;
        return (
          <mesh key={i} material={lampMat} position={[Math.cos(a) * 1.52, 0.02, Math.sin(a) * 1.52]}>
            <sphereGeometry args={[0.065, 8, 8]} />
          </mesh>
        );
      })}
      <mesh material={beamMat} position={[0, -4.1, 0]}>
        <cylinderGeometry args={[0.12, 1.45, 8.2, 18, 1, true]} />
      </mesh>
    </group>
  );
}

function ufoMaterial(kind: number): THREE.Material {
  if (kind === 0) {
    return physicalSkin({
      sway: 0,
      color: "#9aa3ad",
      metalness: 0.94,
      roughness: 0.14,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      sheen: 0,
    });
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
