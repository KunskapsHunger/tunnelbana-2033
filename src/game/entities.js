import * as THREE from 'three';
import { instantiateModel, findPart } from '../engine/assets.js';

// Friendly NPCs, pickups and usable objects (levers, fuse boxes, gates).

export const PICKUPS = {
  ammo_rev: { model: 'pickup_ammo', label: '7,5 mm ammunition', apply: (g, e) => g.arsenal.addAmmo('rev', e.amount ?? 12) },
  ammo_9mm: { model: 'pickup_ammo', label: '9 mm ammunition', apply: (g, e) => g.arsenal.addAmmo('9mm', e.amount ?? 30) },
  ammo_shells: { model: 'pickup_ammo', label: 'Hagelpatroner', apply: (g, e) => g.arsenal.addAmmo('shells', e.amount ?? 8) },
  medkit: { model: 'pickup_medkit', label: 'Förbandslåda', apply: (g) => { g.medkits = Math.min(5, g.medkits + 1); } },
  filter: { model: 'pickup_filter', label: 'Gasmaskfilter', apply: (g) => { g.player.filters = Math.min(9, g.player.filters + 1); } },
  mp: { model: 'pickup_ammo', label: 'Militärpatroner', tint: [1.6, 1.3, 0.5], apply: (g, e) => { g.money += e.amount ?? 10; } },
  weapon_kpist: { model: 'kpist', label: 'Kpist m/45', scale: 1.4, apply: (g) => { g.arsenal.give('kpist'); g.arsenal.addAmmo('9mm', 36); g.arsenal.select('kpist'); } },
  weapon_shotgun: { model: 'shotgun', label: 'Hagelbössa', scale: 1.4, apply: (g) => { g.arsenal.give('shotgun'); g.arsenal.addAmmo('shells', 8); g.arsenal.select('shotgun'); } },
};

export class Pickup {
  constructor(def, obj) {
    this.def = def;
    this.kind = PICKUPS[def.kind];
    this.obj = obj;
    this.taken = false;
    this.baseY = obj.position.y;
    this.phase = Math.random() * 6;
  }

  update(dt) {
    this.phase += dt;
    this.obj.rotation.y += dt * 1.2;
    this.obj.position.y = this.baseY + 0.12 + Math.sin(this.phase * 2.5) * 0.05;
  }
}

export class NPC {
  constructor(def, obj) {
    this.def = def;
    this.id = def.id;
    this.name = def.name;
    this.obj = obj;
    this.pos = new THREE.Vector3(def.x, obj.position.y, def.z);
    this.baseYaw = def.rot ?? 0;
    this.yaw = this.baseYaw;
    this.talking = 0;
    this.phase = Math.random() * 10;
    this.parts = {};
    for (const n of ['torso', 'head', 'arm_l', 'arm_r']) {
      const p = findPart(obj, n);
      if (p) this.parts[n] = { o: p, base: p.rotation.clone() };
    }
    this.hidden = false;
  }

  setHidden(h) {
    this.hidden = h;
    this.obj.visible = !h;
  }

  update(dt, player) {
    if (this.hidden) return;
    this.phase += dt;
    const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    const target = d < 4.5 ? Math.atan2(dx, dz) : this.baseYaw;
    let diff = target - this.yaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.yaw += diff * Math.min(1, dt * 3);
    this.obj.rotation.y = this.yaw;
    this.talking = Math.max(0, this.talking - dt);
    const set = (n, rx = 0, ry = 0, rz = 0) => {
      const p = this.parts[n];
      if (p) p.o.rotation.set(p.base.x + rx, p.base.y + ry, p.base.z + rz);
    };
    const breathe = Math.sin(this.phase * 1.7) * 0.03;
    const talk = this.talking > 0 ? Math.sin(this.phase * 7) : 0;
    set('torso', breathe + (this.def.pose === 'sit' ? 0.2 : 0));
    set('head', Math.sin(this.phase * 0.6) * 0.08 + talk * 0.05, Math.sin(this.phase * 0.4) * 0.15);
    if (this.def.model === 'raider') {
      // Armed NPCs keep the rifle at low ready; no gesturing with it.
      set('arm_r', 0.3 + breathe);
      set('arm_l', 0.3 + breathe);
    } else {
      set('arm_r', this.talking > 0 ? -0.5 - talk * 0.35 : breathe, 0, 0);
      set('arm_l', this.def.pose === 'guard' ? -0.9 : -breathe, 0, 0);
    }
  }
}

export async function spawnPickup(def, grid, parent) {
  const kind = PICKUPS[def.kind];
  const obj = await instantiateModel(kind.model, { unique: !!kind.tint });
  if (kind.tint) obj.traverse((o) => { if (o.isMesh) o.material.uniforms.uTint.value.setRGB(...kind.tint); });
  obj.scale.setScalar(kind.scale ?? 1);
  obj.position.set(def.x, def.y ?? grid.floorAt(def.x, def.z), def.z);
  parent.add(obj);
  return new Pickup(def, obj);
}

export async function spawnNPC(def, grid, parent) {
  const obj = await instantiateModel(def.model ?? 'npc', { unique: true });
  obj.position.set(def.x, grid.floorAt(def.x, def.z), def.z);
  obj.rotation.y = def.rot ?? 0;
  if (def.scale) obj.scale.setScalar(def.scale);
  if (def.tint) obj.traverse((o) => { if (o.isMesh) o.material.uniforms.uTint.value.setRGB(...def.tint); });
  parent.add(obj);
  return new NPC(def, obj);
}
