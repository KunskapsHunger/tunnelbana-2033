import * as THREE from 'three';
import { Grid } from '../levels/grid.js';
import { buildLevelMesh } from '../levels/levelMesh.js';
import { instantiateModel, findPart, materialFor, loadTexture, preloadTextures } from '../engine/assets.js';

// Builds a playable world from a level definition: grid + geometry, props
// with colliders, lights, decals. Dynamic entities (enemies, NPCs, pickups,
// triggers) are returned as spawn lists for the game systems.

const PROP_LIGHTS = {
  barrel_fire: { part: 'flame', color: 0xff8a3a, range: 9, intensity: 1.5, flicker: 0.8, offsetY: 0.3 },
  lamp_hanging: { part: 'light', color: 0xffd9a0, range: 10, intensity: 1.3, flicker: 0.05 },
  generator: { part: 'light', color: 0x9fd0ff, range: 5, intensity: 0.8, flicker: 0.15 },
};

export async function buildWorld(def, lights) {
  const grid = new Grid(def.size[0], def.size[1]);
  def.build(grid);

  const texNames = new Set(['rail_metal', 'metal_panel']);
  for (const c of grid.cells) {
    if (c) { texNames.add(c.ft); texNames.add(c.wt); texNames.add(c.ct); texNames.add(c.et); }
  }
  for (const e of def.entities) if (e.tex) texNames.add(e.tex);
  await preloadTextures([...texNames]);

  const root = new THREE.Group();
  root.name = `world_${def.id}`;
  root.add(buildLevelMesh(grid));

  const spawns = { enemies: [], npcs: [], pickups: [], triggers: [], interactables: [] };
  const props = [];
  const tasks = [];

  for (const e of def.entities) {
    switch (e.type) {
      case 'light':
        lights.add({ pos: new THREE.Vector3(e.x, e.y ?? 3, e.z), color: e.color, range: e.range, intensity: e.intensity, flicker: e.flicker, strobe: e.strobe, tag: e.tag, enabled: e.enabled });
        break;
      case 'prop':
        tasks.push(placeProp(e, root, grid, lights).then((p) => props.push(p)));
        break;
      case 'decal':
        tasks.push(placeDecal(e, root));
        break;
      case 'box':
        placeBox(e, root, grid);
        break;
      case 'enemy': spawns.enemies.push(e); break;
      case 'npc': spawns.npcs.push(e); break;
      case 'pickup': spawns.pickups.push(e); break;
      case 'trigger': spawns.triggers.push({ ...e, fired: false }); break;
      case 'use': spawns.interactables.push({ ...e }); break;
      default: console.warn('[world] unknown entity', e.type);
    }
  }
  await Promise.all(tasks);
  return { def, grid, root, props, spawns };
}

async function placeProp(e, root, grid, lights) {
  const obj = await instantiateModel(e.model, { unique: !!e.unique });
  const y = e.y ?? grid.floorAt(e.x, e.z);
  obj.position.set(e.x, y, e.z);
  obj.rotation.set(e.rx ?? 0, e.rot ?? 0, e.rz ?? 0, 'YXZ');
  if (e.tint) obj.traverse((o) => { if (o.isMesh && o.material.uniforms) o.material.uniforms.uTint.value.setRGB(...e.tint); });
  if (e.scale) obj.scale.setScalar(e.scale);
  root.add(obj);
  obj.updateMatrixWorld(true);
  // Tilted props (bodies lying down, toppled benches) rest on the floor
  // instead of sinking into it.
  if (e.rx || e.rz) {
    const minY = new THREE.Box3().setFromObject(obj).min.y;
    if (minY < y) {
      obj.position.y += y - minY;
      obj.updateMatrixWorld(true);
    }
  }
  const prop = { def: e, obj, box: null, light: null };
  if (e.collide !== false) {
    const bb = new THREE.Box3().setFromObject(obj);
    const shrink = e.shrink ?? 0.05;
    prop.box = grid.addBox(bb.min.x + shrink, bb.min.z + shrink, bb.max.x - shrink, bb.max.z - shrink, bb.min.y, e.top ?? bb.max.y, e.id ?? e.model);
  }
  const pl = PROP_LIGHTS[e.model];
  if (pl && e.light !== false) {
    const part = findPart(obj, pl.part);
    const pos = new THREE.Vector3();
    if (part) part.getWorldPosition(pos);
    else pos.set(e.x, y + 1.2, e.z);
    pos.y += pl.offsetY ?? 0;
    prop.light = lights.add({ pos, color: e.lightColor ?? pl.color, range: e.lightRange ?? pl.range, intensity: e.lightIntensity ?? pl.intensity, flicker: e.flicker ?? pl.flicker, tag: e.id });
    if (e.model === 'barrel_fire') addFlameSprite(root, pos);
  }
  return prop;
}

// Textured solid block: plank bridges over tracks, barricades, ledges.
// x0..x1 / z0..z1 are world metres, y0..y1 bottom/top.
function placeBox(e, root, grid) {
  const w = e.x1 - e.x0, d = e.z1 - e.z0, h = e.y1 - e.y0;
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv;
  const n = geo.attributes.normal;
  const s = e.uvScale ?? 1;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [su, sv] = ay > 0.5 ? [w, d] : ax > 0.5 ? [d, h] : [w, h];
    uv.setXY(i, uv.getX(i) * su / s, uv.getY(i) * sv / s);
  }
  const mesh = new THREE.Mesh(geo, materialFor(e.tex ?? 'wood_planks'));
  mesh.position.set((e.x0 + e.x1) / 2, (e.y0 + e.y1) / 2, (e.z0 + e.z1) / 2);
  root.add(mesh);
  if (e.collide !== false) grid.addBox(e.x0, e.z0, e.x1, e.z1, e.y0, e.y1, e.id ?? 'box');
}

async function placeDecal(e, root) {
  const tex = await loadTexture(e.tex);
  void tex;
  const mat = materialFor(e.tex, { lit: e.lit ?? true, side: e.double ? THREE.DoubleSide : THREE.FrontSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(e.w ?? 1, e.h ?? 1), mat);
  mesh.position.set(e.x, e.y ?? 2, e.z);
  mesh.rotation.set(e.rx ?? 0, e.rot ?? 0, 0);
  mesh.name = `decal_${e.tex}`;
  root.add(mesh);
}

// Two crossed quads with the animated fire strip texture.
function addFlameSprite(root, pos) {
  const mat = materialFor('fx_fire', { lit: false, additive: true, side: THREE.DoubleSide });
  const g = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), mat);
    m.rotation.y = i * Math.PI / 2;
    g.add(m);
  }
  g.position.copy(pos);
  g.userData.flame = true;
  root.add(g);
}
