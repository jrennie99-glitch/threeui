export type Quality = {
  dpr: [number, number];
  fov: number;
  waterSize: number;
  waterSeg: number;
  detail: number;
  fish: [number, number, number];
  kelp: number;
  coral: number;
  rocks: number;
  jellies: number;
  birds: number;
  plankton: number;
  bubbles: number;
  spires: number;
  rays: number;
  refraction: number;
  dof: boolean;
  multisampling: number;
};

const HIGH: Quality = {
  dpr: [1, 1.5],
  fov: 46,
  waterSize: 400,
  waterSeg: 200,
  detail: 1,
  fish: [70, 52, 18],
  kelp: 58,
  coral: 42,
  rocks: 16,
  jellies: 10,
  birds: 8,
  plankton: 460,
  bubbles: 52,
  spires: 9,
  rays: 7,
  refraction: 0.5,
  dof: true,
  multisampling: 2,
};

const LOW: Quality = {
  dpr: [1, 1.2],
  fov: 58,
  waterSize: 260,
  waterSeg: 84,
  detail: 0,
  fish: [24, 18, 8],
  kelp: 22,
  coral: 16,
  rocks: 8,
  jellies: 6,
  birds: 5,
  plankton: 150,
  bubbles: 18,
  spires: 5,
  rays: 4,
  refraction: 0,
  dof: false,
  multisampling: 0,
};

export function detectQuality(): Quality {
  if (typeof window === "undefined") return HIGH;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 840;
  const saveData = "connection" in navigator && (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
  const q = coarse || narrow || saveData ? { ...LOW } : { ...HIGH };
  const area = window.innerWidth * window.innerHeight;
  const cap = area < 1_050_000 ? 1.6 : area < 1_700_000 ? 1.35 : 1.15;
  q.dpr = [1, Math.min(q.dpr[1], cap)];
  if (area > 2_400_000) {
    q.refraction = q.refraction > 0 ? 0.35 : 0;
    q.dof = false;
    q.multisampling = 0;
  }
  return q;
}

export const quality = detectQuality();
