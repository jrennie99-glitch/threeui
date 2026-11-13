import * as THREE from "three";

function skin(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const count = geo.attributes.position.count;
  if (!geo.getAttribute("aTint")) {
    geo.setAttribute("aTint", new THREE.BufferAttribute(new Float32Array(count * 3).fill(1), 3));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(new Float32Array(count), 1));
  }
  return geo;
}

/** Doric shaft: entasis plus carved flutes. */
export function createFlutedColumn(height = 4.4, radius = 0.34, flutes = 20): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius * 0.9, radius, height, flutes * 3, 18, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ang = Math.atan2(z, x);
    const flute = 1.0 + Math.cos(ang * flutes) * 0.11;
    const t = y / height + 0.5;
    const entasis = 1 - (t - 0.2) * (t - 0.2) * 0.12;
    pos.setXYZ(i, x * flute * entasis, y, z * flute * entasis);
  }
  geo.computeVertexNormals();
  return skin(geo);
}

export function createCapital(): THREE.BufferGeometry {
  const abacus = new THREE.BoxGeometry(1.05, 0.14, 1.05);
  const echinus = new THREE.CylinderGeometry(0.48, 0.36, 0.22, 28);
  echinus.translate(0, -0.16, 0);
  const neck = new THREE.CylinderGeometry(0.34, 0.32, 0.16, 24);
  neck.translate(0, -0.32, 0);
  const merged = merge([abacus, echinus, neck]);
  merged.translate(0, 0.2, 0);
  return skin(merged);
}

/** Shallow arch. `span` is the distance between column centers. */
export function createArch(span = 3.46): THREE.BufferGeometry {
  const arc = 1.9;
  const radius = span / (2 * Math.sin(arc / 2));
  const geo = new THREE.TorusGeometry(radius, 0.11, 8, 32, arc);
  geo.rotateZ(Math.PI / 2 - arc / 2);
  geo.computeBoundingBox();
  const minY = geo.boundingBox?.min.y ?? 0;
  geo.translate(0, -minY, 0);
  geo.rotateY(Math.PI / 2);
  return skin(geo);
}

export function createStairs(steps = 7, width = 6.5): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < steps; i += 1) {
    const tread = new THREE.BoxGeometry(width - i * 0.15, 0.16, 0.55);
    tread.translate(0, i * 0.16, 2.2 + i * 0.48);
    parts.push(tread);
  }
  return skin(merge(parts));
}

export function createDome(radius = 3.1): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(radius, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.52);
  return skin(geo);
}

export function createDrum(radius = 3.3, height = 1.5): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(radius, radius * 1.04, height, 40, 1, true);
  return skin(geo);
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  for (const source of parts) {
    const part = source.index ? source.toNonIndexed() : source;
    part.computeVertexNormals();
    const pos = part.attributes.position;
    const nor = part.attributes.normal;
    const uv = part.attributes.uv;
    for (let i = 0; i < pos.count; i += 1) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      if (uv) uvs.push(uv.getX(i), uv.getY(i));
      else uvs.push(0, 0);
    }
  }
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  return geo;
}
