import * as THREE from "three";

export const shared = {
  uTime: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0.42, 0.2, -0.62).normalize() },
  uFogColor: { value: new THREE.Color("#c9b39a") },
  uFogDensity: { value: 0.004 },
  uUfoPos: { value: new THREE.Vector3(0, -16, -20) },
  uCityPos: { value: new THREE.Vector3(0, -63.2, 0) },
  uResolution: { value: new THREE.Vector2(1, 1) },
  uUnder: { value: 0 },
  uHasScene: { value: 0 },
  uHasSky: { value: 0 },
  uSky: { value: new THREE.Texture() },
  uDetail: { value: 1 },
  hdr: null as THREE.Texture | null,
};

export const sceneRefs: {
  sky: THREE.Object3D | null;
  water: THREE.Object3D | null;
  waterMat: THREE.ShaderMaterial | null;
} = { sky: null, water: null, waterMat: null };

const surfaceFog = new THREE.Color("#d7b08a");
const shallowFog = new THREE.Color("#0e7c86");
const midFog = new THREE.Color("#063e4c");
const deepFog = new THREE.Color("#02161c");
const abyssFog = new THREE.Color("#041018");
const cityFog = new THREE.Color("#143e4e");
const scratch = new THREE.Color();

export function updateFog(cameraY: number): void {
  if (cameraY > 0.4) {
    shared.uFogColor.value.copy(surfaceFog);
    shared.uFogDensity.value = 0.0035;
    return;
  }
  const depth = Math.max(0, -cameraY);
  if (depth < 10) scratch.copy(shallowFog).lerp(midFog, depth / 10);
  else if (depth < 28) scratch.copy(midFog).lerp(deepFog, (depth - 10) / 18);
  else scratch.copy(deepFog).lerp(abyssFog, Math.min(1, (depth - 28) / 24));
  shared.uFogColor.value.copy(scratch);
  const baseDensity = 0.016 + Math.min(depth, 36) * 0.00075;
  if (depth > 48) {
    const pocket = Math.min(1, (depth - 48) / 8);
    shared.uFogColor.value.lerp(cityFog, pocket);
    shared.uFogDensity.value = baseDensity * (1 - pocket) + 0.011 * pocket;
  } else {
    shared.uFogDensity.value = baseDensity;
  }
}

export function fogBackground(): THREE.Color {
  return shared.uFogColor.value;
}
