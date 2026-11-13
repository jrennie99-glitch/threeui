import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

function paint(geo: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const n = geo.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    arr[i * 3] = color.r;
    arr[i * 3 + 1] = color.g;
    arr[i * 3 + 2] = color.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}

function paintByY(
  geo: THREE.BufferGeometry,
  top: THREE.Color,
  bottom: THREE.Color,
): THREE.BufferGeometry {
  const pos = geo.attributes.position;
  const arr = new Float32Array(pos.count * 3);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < pos.count; i += 1) {
    const y = pos.getY(i);
    min = Math.min(min, y);
    max = Math.max(max, y);
  }
  const span = Math.max(0.0001, max - min);
  for (let i = 0; i < pos.count; i += 1) {
    const t = (pos.getY(i) - min) / span;
    arr[i * 3] = bottom.r + (top.r - bottom.r) * t;
    arr[i * 3 + 1] = bottom.g + (top.g - bottom.g) * t;
    arr[i * 3 + 2] = bottom.b + (top.b - bottom.b) * t;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return geo;
}

function mustMerge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geo = mergeGeometries(parts, false);
  if (!geo) throw new Error("geometry merge failed");
  geo.computeVertexNormals();
  return geo;
}

export function createFishGeometry(): THREE.BufferGeometry {
  const profile = [
    [0.01, -0.66],
    [0.045, -0.52],
    [0.1, -0.3],
    [0.15, -0.05],
    [0.155, 0.16],
    [0.11, 0.36],
    [0.05, 0.5],
    [0.012, 0.58],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.LatheGeometry(profile, 36);
  body.rotateX(Math.PI / 2);
  body.scale(0.82, 0.62, 1);
  paintByY(body, new THREE.Color("#f4f7f8"), new THREE.Color("#f0c9a0"));
  const tail = new THREE.SphereGeometry(0.18, 20, 14);
  tail.scale(0.18, 1.15, 0.42);
  tail.translate(0, 0, -0.64);
  paint(tail, new THREE.Color("#ffe6c4"));
  const dorsal = new THREE.SphereGeometry(0.12, 16, 10);
  dorsal.scale(0.18, 0.85, 0.7);
  dorsal.translate(0, 0.1, -0.02);
  paint(dorsal, new THREE.Color("#fff4e2"));
  const fin = new THREE.SphereGeometry(0.1, 16, 10);
  fin.scale(0.35, 0.08, 0.85);
  fin.translate(0.13, -0.02, 0.08);
  paint(fin, new THREE.Color("#fff1d4"));
  const finR = fin.clone();
  finR.translate(-0.26, 0, 0);
  paint(finR, new THREE.Color("#fff1d4"));
  const eye = new THREE.SphereGeometry(0.028, 12, 10);
  eye.translate(0.07, 0.04, 0.4);
  paint(eye, new THREE.Color("#0c0a09"));
  const eyeR = eye.clone();
  eyeR.translate(-0.14, 0, 0);
  paint(eyeR, new THREE.Color("#0c0a09"));
  return mustMerge([body, tail, dorsal, fin, finR, eye, eyeR]);
}

export function createKelpGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(0.42, 1, 1, 10);
  paintByY(geo, new THREE.Color("#f0d48a"), new THREE.Color("#143528"));
  return geo;
}

export function createBrainCoral(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 4);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = 1 + Math.sin(x * 7.0) * Math.cos(z * 6.0) * 0.16 + Math.sin(y * 9.0) * 0.06;
    pos.setXYZ(i, x * n, y * n * 0.72, z * n);
  }
  geo.computeVertexNormals();
  paint(geo, new THREE.Color("#ffffff"));
  return geo;
}

export function createBranchCoral(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
    const trunk = new THREE.CylinderGeometry(0.08, 0.14, 1.3, 12);
  trunk.translate(0, 0.65, 0);
  parts.push(paint(trunk, new THREE.Color("#ffd0c2")));
  for (let i = 0; i < 6; i += 1) {
    const arm = new THREE.CylinderGeometry(0.035, 0.07, 0.72, 10);
    arm.translate(0, 0.36, 0);
    arm.rotateZ((i - 2.5) * 0.42);
    arm.rotateY(i * 1.1);
    arm.translate(0, 1.05, 0);
    parts.push(paint(arm, new THREE.Color("#ffe1d6")));
  }
  return mustMerge(parts);
}

export function createFanCoral(): THREE.BufferGeometry {
  const geo = new THREE.CircleGeometry(1, 18);
  geo.scale(1, 1.25, 1);
  geo.translate(0, 1.05, 0);
  paint(geo, new THREE.Color("#ffffff"));
  return geo;
}

export function createRockGeometry(): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(1, 3);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n = 1 + Math.sin(x * 3.1 + z) * 0.18 + Math.cos(y * 4.0) * 0.08;
    pos.setXYZ(i, x * n * 1.3, y * n * 0.55, z * n);
  }
  geo.computeVertexNormals();
  paint(geo, new THREE.Color("#ffffff"));
  return geo;
}

export function createMantaGeometry(): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(6.4, 2.7, 48, 22);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const wing = Math.abs(x) / 3.2;
    const droop = Math.pow(wing, 1.4) * 0.48;
    const body = Math.exp(-x * x * 0.7) * 0.2 * (1 - Math.min(1, Math.abs(y) / 1.35));
    pos.setZ(i, body - droop);
    const taper = 0.45 + 0.55 * Math.max(0, Math.cos((y / 1.35) * 1.05));
    pos.setX(i, x * taper);
  }
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  paintByY(geo, new THREE.Color("#2a3340"), new THREE.Color("#e7ece8"));
  return geo;
}

export function createWhaleGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.02, -4.6),
    new THREE.Vector2(0.28, -3.8),
    new THREE.Vector2(0.62, -2.2),
    new THREE.Vector2(0.92, -0.2),
    new THREE.Vector2(0.84, 1.6),
    new THREE.Vector2(0.48, 3.1),
    new THREE.Vector2(0.16, 4.0),
  ];
  const body = new THREE.LatheGeometry(pts, 48);
  body.rotateX(Math.PI / 2);
  const parts: THREE.BufferGeometry[] = [body];
  const flukeL = new THREE.SphereGeometry(0.55, 10, 8);
  flukeL.scale(1.35, 0.08, 0.72);
  flukeL.translate(0.72, 0, -4.35);
  parts.push(flukeL);
  const flukeR = flukeL.clone();
  flukeR.translate(-1.44, 0, 0);
  parts.push(flukeR);
  const pec = new THREE.SphereGeometry(0.46, 8, 6);
  pec.scale(1.25, 0.1, 0.48);
  pec.rotateZ(0.5);
  pec.translate(0.95, -0.15, 1.1);
  parts.push(pec);
  const pec2 = pec.clone();
  pec2.scale(1, 1, 1);
  pec2.translate(-1.9, 0, 0);
  parts.push(pec2);
  const eye = new THREE.SphereGeometry(0.07, 8, 6);
  eye.translate(0.32, 0.18, 3.15);
  parts.push(eye);
  const geo = mustMerge(parts);
  paintByY(geo, new THREE.Color("#243040"), new THREE.Color("#c5ced0"));
  const col = geo.attributes.color;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const z = pos.getZ(i);
    const x = Math.abs(pos.getX(i));
    const y = pos.getY(i);
    if (z > 2.9 && z < 3.4 && x > 0.18 && x < 0.5 && y > 0.05 && y < 0.35) {
      col.setXYZ(i, 0.04, 0.03, 0.02);
    }
  }
  return geo;
}

export function createBirdGeometry(): THREE.BufferGeometry {
  const body = new THREE.SphereGeometry(0.12, 8, 6);
  body.scale(0.7, 0.55, 1.4);
  const wingL = new THREE.SphereGeometry(0.16, 6, 4);
  wingL.scale(1.8, 0.12, 0.55);
  wingL.translate(0.32, 0, 0);
  const wingR = wingL.clone();
  wingR.translate(-0.64, 0, 0);
  const geo = mustMerge([
    paint(body, new THREE.Color("#f4f1ea")),
    paint(wingL, new THREE.Color("#d9d3c7")),
    paint(wingR, new THREE.Color("#d9d3c7")),
  ]);
  return geo;
}

export function createJellyBell(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(0.55, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62);
}

export function createTentacle(): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(0.02, 0.012, 1.35, 5, 10, true);
  geo.translate(0, -0.75, 0);
  return geo;
}

export function createBubbleGeometry(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(1, 12, 10);
}
