import * as THREE from "three";

export type Vec3 = [number, number, number];

type Key = { t: number; pos: Vec3; look: Vec3 };

/** Camera chapters. Progress matches the sticky bands in styles.css. */
export const KEYS: Key[] = [
  { t: 0.0, pos: [0.2, 6.4, 24], look: [0.4, 1.5, -16] },
  { t: 0.08, pos: [0.4, 3.6, 13], look: [0.2, 0.55, -20] },
  { t: 0.14, pos: [0.1, 1.05, 6.5], look: [0.3, -0.4, -12] },
  { t: 0.2, pos: [-0.2, -2.2, 2.4], look: [0.6, -6.2, -12] },
  { t: 0.3, pos: [1.6, -8.4, -1.5], look: [0.2, -11.4, -16] },
  { t: 0.4, pos: [2.4, -11.6, -5], look: [-1.2, -12.8, -18] },
  { t: 0.5, pos: [3.2, -16.6, -6.5], look: [-6, -18.2, -22] },
  { t: 0.62, pos: [0.8, -26.5, -2.5], look: [0.2, -36, -6] },
  { t: 0.74, pos: [0.3, -42, 1.5], look: [0.4, -54, -1] },
  { t: 0.86, pos: [-3.2, -55.6, 14], look: [2.2, -60.6, -1] },
  { t: 1.0, pos: [-4.6, -57.4, 18], look: [2.8, -60.9, 0] },
];

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};

export function sampleRoute(t: number): { pos: Vec3; look: Vec3 } {
  const s = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].t < s) i += 1;
  const a = KEYS[i];
  const b = KEYS[Math.min(i + 1, KEYS.length - 1)];
  const u = smooth((s - a.t) / Math.max(0.0001, b.t - a.t));
  const lerp = (p: number, q: number) => p + (q - p) * u;
  return {
    pos: [lerp(a.pos[0], b.pos[0]), lerp(a.pos[1], b.pos[1]), lerp(a.pos[2], b.pos[2])],
    look: [lerp(a.look[0], b.look[0]), lerp(a.look[1], b.look[1]), lerp(a.look[2], b.look[2])],
  };
}

export function zoneLabel(progress: number, cameraY: number): string {
  if (cameraY > -0.35) return "Surface";
  if (progress < 0.36) return "Reef";
  if (progress < 0.56) return "Blue";
  if (progress < 0.8) return "Descent";
  return "Atlantis";
}

export const beats: Record<string, number> = {
  surface: 0.06,
  reef: 0.32,
  whale: 0.5,
  ufo: 0.68,
  atlantis: 0.94,
};

export const dive = {
  target: 0,
  smooth: 0,
  time: 0,
  dt: 1 / 60,
  cameraY: 6,
  prevY: 6,
  splash: 0,
  pointerX: 0,
  pointerY: 0,
  pointerAt: 0,
  debug: typeof window !== "undefined" && new URLSearchParams(window.location.search).has("debug"),
  ufo: new THREE.Vector3(0, -16, -20),
};

export function pointerActive(now = performance.now()): boolean {
  return now - dive.pointerAt < 1600;
}

export function ufoAt(time: number, progress: number, out: THREE.Vector3): THREE.Vector3 {
  if (progress < 0.46) {
    return out.set(Math.sin(time * 0.25) * 3, -19, -30);
  }
  if (progress > 0.84) {
    return out.set(Math.sin(time * 0.3) * 2.2, -57.2, -1.5);
  }
  const route = sampleRoute(Math.min(0.82, progress + 0.05));
  return out.set(
    route.look[0] + Math.sin(time * 0.4) * 0.4,
    route.look[1] + 2.2 + Math.sin(time * 0.9) * 0.2,
    route.look[2] + 1.5,
  );
}

export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
