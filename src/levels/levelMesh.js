import * as THREE from 'three';
import { fbm3 } from '../engine/noise.js';
import { materialFor } from '../engine/assets.js';
import { CELL } from './grid.js';

// Turns a Grid into render meshes: floors, vaulted cave ceilings, rock walls
// with noise displacement, platform edges and rails. Faces are grouped by
// texture so each texture becomes a single draw call.

const WALL_SKIRT = 0.35;
const SEG = 1.0;

class Batch {
  constructor() { this.pos = []; this.uv = []; }
  tri(a, b, c, ua, ub, uc) {
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    this.uv.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
  }
}

export function buildLevelMesh(grid) {
  const dist = grid.distanceField();
  const batches = new Map();
  const batch = (tex) => {
    if (!batches.has(tex)) batches.set(tex, new Batch());
    return batches.get(tex);
  };
  const W = grid.width;

  const distAt = (x, z) => (grid.inBounds(x, z) ? dist[z * W + x] : 0);
  // Corner (cx,cz) is shared by cells (cx-1..cx, cz-1..cz).
  const cornerCells = (cx, cz) => [grid.get(cx - 1, cz - 1), grid.get(cx, cz - 1), grid.get(cx - 1, cz), grid.get(cx, cz)];
  const cornerDist = (cx, cz) => Math.min(distAt(cx - 1, cz - 1), distAt(cx, cz - 1), distAt(cx - 1, cz), distAt(cx, cz));

  const cornerInfo = new Map();
  const infoAt = (cx, cz) => {
    const key = cz * (W + 1) + cx;
    let info = cornerInfo.get(key);
    if (info) return info;
    const open = cornerCells(cx, cz).filter(Boolean);
    const amp = open.length ? Math.min(...open.map((c) => c.noise)) : 0;
    const minFloor = open.length ? Math.min(...open.map((c) => c.floor)) : 0;
    info = { amp, minFloor, d: cornerDist(cx, cz) };
    cornerInfo.set(key, info);
    return info;
  };

  const ceilCorner = (cell, cx, cz) => {
    const d = infoAt(cx, cz).d;
    return cell.ceil + cell.vault * Math.pow(Math.min(d, 9), 0.85);
  };

  // Displace a vertex on corner (cx,cz) at height y. Pure function of
  // (corner, y) so coincident vertices from different faces always match.
  const P = (cx, cz, y) => {
    const { amp, minFloor } = infoAt(cx, cz);
    const x = cx * CELL, z = cz * CELL;
    if (amp <= 0) return [x, y, z];
    const f = Math.min(1, Math.max(0, (y - minFloor - 0.15) / 1.4)) * amp;
    if (f <= 0) return [x, y, z];
    const s = 0.55;
    return [
      x + fbm3(x * s, y * s, z * s + 11.3) * f * 1.6,
      y + fbm3(x * s + 7.1, y * s, z * s) * f,
      z + fbm3(x * s, y * s + 3.7, z * s) * f * 1.6,
    ];
  };

  const quad = (b, p0, p1, p2, p3, u0, u1, u2, u3, normalHint) => {
    // p0..p3 in order around the quad; flip to face normalHint.
    const e1 = sub(p1, p0), e2 = sub(p2, p0);
    const n = cross(e1, e2);
    if (dot(n, normalHint) < 0) {
      b.tri(p0, p2, p1, u0, u2, u1);
      b.tri(p0, p3, p2, u0, u3, u2);
    } else {
      b.tri(p0, p1, p2, u0, u1, u2);
      b.tri(p0, p2, p3, u0, u2, u3);
    }
  };

  for (let z = 0; z < grid.depth; z++) {
    for (let x = 0; x < W; x++) {
      const c = grid.get(x, z);
      if (!c) continue;
      const fs = c.floorScale;
      // Floor
      const fuv = (px, pz) => {
        if (!c.fRot) return [px / fs, pz / fs];
        const v = px - x;
        return [pz / fs, c.fFlip ? 1 - v : v];
      };
      quad(batch(c.ft),
        P(x, z, c.floor), P(x + 1, z, c.floor), P(x + 1, z + 1, c.floor), P(x, z + 1, c.floor),
        fuv(x, z), fuv(x + 1, z), fuv(x + 1, z + 1), fuv(x, z + 1),
        [0, 1, 0]);
      // Ceiling
      const h00 = ceilCorner(c, x, z), h10 = ceilCorner(c, x + 1, z);
      const h11 = ceilCorner(c, x + 1, z + 1), h01 = ceilCorner(c, x, z + 1);
      c.ceilMax = Math.max(h00, h10, h11, h01);
      const cs = 3;
      quad(batch(c.ct),
        P(x, z, h00), P(x + 1, z, h10), P(x + 1, z + 1, h11), P(x, z + 1, h01),
        [x / cs, z / cs], [(x + 1) / cs, z / cs], [(x + 1) / cs, (z + 1) / cs], [x / cs, (z + 1) / cs],
        [0, -1, 0]);

      // Edges: +x, -x, +z, -z
      const edges = [
        { nx: 1, nz: 0, a: [x + 1, z], b: [x + 1, z + 1] },
        { nx: -1, nz: 0, a: [x, z + 1], b: [x, z] },
        { nx: 0, nz: 1, a: [x + 1, z + 1], b: [x, z + 1] },
        { nx: 0, nz: -1, a: [x, z], b: [x + 1, z] },
      ];
      for (const e of edges) {
        const n = grid.get(x + e.nx, z + e.nz);
        const inward = [-e.nx, 0, -e.nz];
        const outward = [e.nx, 0, e.nz];
        const ca = ceilCorner(c, e.a[0], e.a[1]);
        const cb = ceilCorner(c, e.b[0], e.b[1]);
        if (!n) {
          wall(c, e, c.floor - WALL_SKIRT, ca, cb, inward);
          continue;
        }
        // Floor step down into the neighbour: draw the riser.
        if (n.floor < c.floor - 0.01) {
          const b = batch(c.et);
          const along = (p) => (e.nx !== 0 ? p[1] : p[0]);
          const ua = along(e.a), ub = along(e.b);
          const vh = c.floor - n.floor;
          quad(b,
            P(e.a[0], e.a[1], n.floor), P(e.b[0], e.b[1], n.floor), P(e.b[0], e.b[1], c.floor), P(e.a[0], e.a[1], c.floor),
            [ua / 2, 0], [ub / 2, 0], [ub / 2, vh / 2 * 2], [ua / 2, vh / 2 * 2],
            outward);
        }
        // Ceiling step up into the neighbour: draw the lintel facing it.
        const na = ceilCorner(n, e.a[0], e.a[1]);
        const nb = ceilCorner(n, e.b[0], e.b[1]);
        if (na > ca + 0.01 || nb > cb + 0.01) {
          wall(c, e, Math.min(ca, cb), Math.max(na, ca), Math.max(nb, cb), outward, true, ca, cb);
        }
      }
    }
  }

  function wall(c, e, bottom, topA, topB, normal, lintel = false, baseA = bottom, baseB = bottom) {
    const along = (p) => (e.nx !== 0 ? p[1] : p[0]);
    const ua = along(e.a), ub = along(e.b);
    const botA = lintel ? baseA : bottom;
    const botB = lintel ? baseB : bottom;
    const n = Math.max(1, Math.ceil(Math.max(topA - botA, topB - botB) / SEG));
    for (let i = 0; i < n; i++) {
      const ya0 = botA + ((topA - botA) * i) / n, ya1 = botA + ((topA - botA) * (i + 1)) / n;
      const yb0 = botB + ((topB - botB) * i) / n, yb1 = botB + ((topB - botB) * (i + 1)) / n;
      const mid = (ya0 + yb1) / 2;
      const upper = mid > c.floor + c.wallH;
      const tex = upper ? c.ct : c.wt;
      const su = upper ? 3 : c.wallU, sv = upper ? 3 : c.wallV;
      const v = (y) => (y - (upper ? 0 : c.floor)) / sv;
      quad(batch(tex),
        P(e.a[0], e.a[1], ya0), P(e.b[0], e.b[1], yb0), P(e.b[0], e.b[1], yb1), P(e.a[0], e.a[1], ya1),
        [ua / su, v(ya0)], [ub / su, v(yb0)], [ub / su, v(yb1)], [ua / su, v(ya1)],
        normal);
    }
  }

  const group = new THREE.Group();
  group.name = 'level';
  for (const [tex, b] of batches) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, materialFor(tex));
    mesh.name = `level_${tex}`;
    group.add(mesh);
  }
  group.add(buildRails(grid));
  return group;
}

// Two running rails + the covered third (power) rail per track line.
function buildRails(grid) {
  const group = new THREE.Group();
  const railMat = materialFor('rail_metal');
  const powerMat = materialFor('metal_panel');
  for (const t of grid.tracks) {
    const len = t.to - t.from;
    const mid = (t.from + t.to) / 2;
    const mk = (w, h, offset, mat, y) => {
      const geo = t.axis === 'z'
        ? new THREE.BoxGeometry(w, h, len)
        : new THREE.BoxGeometry(len, h, w);
      scaleBoxUV(geo, len);
      const m = new THREE.Mesh(geo, mat);
      if (t.axis === 'z') m.position.set(t.center + offset, y, mid);
      else m.position.set(mid, y, t.center + offset);
      group.add(m);
    };
    mk(0.08, 0.16, -0.72, railMat, t.y + 0.08);
    mk(0.08, 0.16, 0.72, railMat, t.y + 0.08);
    const side = t.powerSide ?? 1;
    mk(0.1, 0.12, side * 1.35, railMat, t.y + 0.3);
    mk(0.26, 0.04, side * 1.35, powerMat, t.y + 0.4);
  }
  return group;
}

function scaleBoxUV(geo, len) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * len * 0.5);
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
