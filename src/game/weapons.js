import * as THREE from 'three';
import { instantiateModel, findPart, materialFor } from '../engine/assets.js';
import { audio } from '../engine/audio.js';

// Weapon definitions, inventory and the first-person viewmodel.

export const WEAPONS = {
  knife: {
    slot: 1, name: 'Kniv', model: 'knife', melee: true, damage: 40, range: 1.9, rate: 0.55,
    sound: 'knife_swing', hitSound: 'knife_hit', offset: [0.2, -0.24, -0.38], rot: [0, 0, 0],
  },
  revolver: {
    slot: 2, name: 'Revolver m/1887', model: 'revolver', ammo: 'rev', mag: 6, damage: 45, rate: 0.36,
    spread: 0.008, pellets: 1, reload: 2.3, recoil: 0.09, sound: 'shot_revolver', reloadSound: 'reload_revolver',
    offset: [0.17, -0.2, -0.36], rot: [0, 0, 0], flash: 0.22,
  },
  kpist: {
    slot: 3, name: 'Kpist m/45', model: 'kpist', ammo: '9mm', mag: 36, damage: 18, rate: 0.1, auto: true,
    spread: 0.03, pellets: 1, reload: 2.5, recoil: 0.035, sound: 'shot_kpist', reloadSound: 'reload_kpist',
    offset: [0.16, -0.22, -0.34], rot: [0, 0, 0], flash: 0.2,
  },
  shotgun: {
    slot: 4, name: 'Hagelbössa', model: 'shotgun', ammo: 'shells', mag: 2, damage: 13, rate: 0.28,
    spread: 0.085, pellets: 9, reload: 2.2, recoil: 0.16, sound: 'shot_shotgun', reloadSound: 'reload_shotgun',
    offset: [0.17, -0.22, -0.33], rot: [0, 0, 0], flash: 0.32,
  },
};

export const AMMO_NAMES = { rev: '7,5 mm', '9mm': '9 mm', shells: 'Hagel' };
export const AMMO_MAX = { rev: 60, '9mm': 240, shells: 40 };

export class Arsenal {
  constructor(viewCamera) {
    this.viewCamera = viewCamera;
    this.owned = new Set(['knife', 'revolver']);
    this.magazine = { knife: 0, revolver: 6, kpist: 0, shotgun: 0 };
    this.reserve = { rev: 18, '9mm': 0, shells: 0 };
    this.current = 'revolver';
    this.pending = null;
    this.models = {};
    this.holder = new THREE.Group();
    viewCamera.add(this.holder);
    this.cooldown = 0;
    this.reloading = 0;
    this.switching = 0;
    this.kick = 0;
    this.swayX = 0;
    this.swayY = 0;
    this.melee = 0;
    this.flash = null;
    this.flashTime = 0;
    this.onFire = null;
  }

  async load() {
    await Promise.all(Object.entries(WEAPONS).map(async ([id, w]) => {
      const m = await instantiateModel(w.model);
      m.visible = false;
      m.traverse((o) => { o.frustumCulled = false; });
      this.models[id] = m;
      this.holder.add(m);
    }));
    const flashMat = materialFor('fx_muzzle', { lit: false, additive: true, side: THREE.DoubleSide });
    this.flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flashMat);
    this.flash.visible = false;
    this.flash.frustumCulled = false;
    this.showCurrent();
  }

  toSave() {
    return { owned: [...this.owned], magazine: { ...this.magazine }, reserve: { ...this.reserve }, current: this.current };
  }

  fromSave(s) {
    this.owned = new Set(s.owned);
    this.magazine = { ...s.magazine };
    this.reserve = { ...s.reserve };
    this.current = s.current;
    this.showCurrent();
  }

  showCurrent() {
    for (const [id, m] of Object.entries(this.models)) m.visible = id === this.current;
    const m = this.models[this.current];
    if (!m) return;
    const w = WEAPONS[this.current];
    // Models face -Y in Blender => +Z in three; turn them to point forward (-Z).
    m.rotation.set(w.rot[0], Math.PI + w.rot[1], w.rot[2]);
    const muzzle = findPart(m, 'muzzle');
    if (muzzle && this.flash) {
      muzzle.add(this.flash);
      this.flash.scale.setScalar(w.flash ?? 0.2);
    }
  }

  give(id) {
    const isNew = !this.owned.has(id);
    this.owned.add(id);
    const w = WEAPONS[id];
    if (isNew && w.mag) this.magazine[id] = w.mag;
    return isNew;
  }

  addAmmo(type, n) {
    this.reserve[type] = Math.min(AMMO_MAX[type], (this.reserve[type] ?? 0) + n);
  }

  get weapon() { return WEAPONS[this.current]; }

  select(id) {
    if (!this.owned.has(id) || id === this.current || this.switching > 0) return;
    this.pending = id;
    this.switching = 0.45;
    this.reloading = 0;
    audio.play('weapon_switch', { volume: 0.6 });
  }

  cycle(dir) {
    const list = Object.keys(WEAPONS).filter((id) => this.owned.has(id));
    const i = list.indexOf(this.pending ?? this.current);
    this.select(list[(i + dir + list.length) % list.length]);
  }

  startReload() {
    const w = this.weapon;
    if (!w.mag || this.reloading > 0 || this.switching > 0) return;
    if (this.magazine[this.current] >= w.mag || (this.reserve[w.ammo] ?? 0) <= 0) return;
    this.reloading = w.reload;
    audio.play(w.reloadSound, { volume: 0.8 });
  }

  finishReload() {
    const w = this.weapon;
    const need = w.mag - this.magazine[this.current];
    const take = Math.min(need, this.reserve[w.ammo]);
    this.magazine[this.current] += take;
    this.reserve[w.ammo] -= take;
  }

  /**
   * Try to fire. Returns a shot description or null.
   * @param {boolean} held  trigger held this frame
   * @param {boolean} pressed  trigger pressed this frame
   */
  tryFire(held, pressed) {
    const w = this.weapon;
    if (this.cooldown > 0 || this.switching > 0 || this.reloading > 0) return null;
    if (!(w.auto ? held : pressed)) return null;
    if (w.melee) {
      this.cooldown = w.rate;
      this.melee = 1;
      audio.play(w.sound, { volume: 0.7, rate: 0.9 + Math.random() * 0.2 });
      return { melee: true, weapon: w };
    }
    if (this.magazine[this.current] <= 0) {
      if (pressed) audio.play('dry_fire', { volume: 0.7 });
      this.cooldown = 0.25;
      if ((this.reserve[w.ammo] ?? 0) > 0) this.startReload();
      return null;
    }
    this.magazine[this.current] -= 1;
    this.cooldown = w.rate;
    this.kick = Math.min(1, this.kick + w.recoil * 6);
    this.flashTime = 0.05;
    audio.play(w.sound, { volume: 0.9, rate: 0.95 + Math.random() * 0.1 });
    return { melee: false, weapon: w };
  }

  update(dt, player, mouse) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) { this.reloading = 0; this.finishReload(); }
    }
    if (this.switching > 0) {
      const before = this.switching;
      this.switching -= dt;
      if (before > 0.225 && this.switching <= 0.225 && this.pending) {
        this.current = this.pending;
        this.pending = null;
        this.showCurrent();
      }
      if (this.switching < 0) this.switching = 0;
    }
    this.kick = Math.max(0, this.kick - dt * 5);
    this.melee = Math.max(0, this.melee - dt * 2.6);
    this.flashTime -= dt;
    if (this.flash) {
      this.flash.visible = this.flashTime > 0;
      this.flash.rotation.z = Math.random() * Math.PI;
    }
    this.swayX += (-mouse.x * 0.0009 - this.swayX) * Math.min(1, dt * 8);
    this.swayY += (mouse.y * 0.0009 - this.swayY) * Math.min(1, dt * 8);
    this.pose(player);
  }

  pose(player) {
    const m = this.models[this.current];
    if (!m) return;
    const w = this.weapon;
    const bob = player.bobAmount;
    const ph = player.bobPhase;
    let x = w.offset[0] + Math.cos(ph) * 0.012 * bob + this.swayX;
    let y = w.offset[1] - Math.abs(Math.sin(ph)) * 0.014 * bob + this.swayY - player.landImpact * 0.3;
    let z = w.offset[2] + this.kick * 0.06;
    let rx = this.kick * 0.35;
    let ry = 0;
    let rz = 0;
    // Switch: dip down and back up.
    if (this.switching > 0) {
      const t = this.switching / 0.45;
      const d = Math.sin(t * Math.PI);
      y -= d * 0.35;
      rx -= d * 0.6;
    }
    // Reload: tilt and lower, animate parts.
    const rl = this.reloading > 0 ? this.reloading / w.reload : 0;
    if (rl > 0) {
      const d = Math.sin(rl * Math.PI);
      y -= d * 0.1;
      rz += d * 0.6;
      rx += d * 0.25;
    }
    this.animateParts(m, rl);
    // Knife swing: slash across.
    if (w.melee && this.melee > 0) {
      const s = Math.sin(this.melee * Math.PI);
      x -= s * 0.22;
      rz += s * 0.9;
      rx -= s * 0.4;
      z -= s * 0.1;
    } else if (this.melee > 0) {
      // Quick melee with a firearm: jab forward and to the left.
      const s = Math.sin(this.melee * Math.PI);
      x -= s * 0.12;
      z -= s * 0.16;
      rz -= s * 0.5;
      ry += s * 0.4;
    }
    if (player.cranking) { y -= 0.25; rx -= 0.5; }
    m.position.set(x, y, z);
    m.rotation.set(w.rot[0] + rx, Math.PI + w.rot[1] + ry, w.rot[2] + rz);
  }

  animateParts(m, rl) {
    const d = rl > 0 ? Math.sin(rl * Math.PI) : 0;
    if (this.current === 'revolver') {
      const cyl = findCached(m, 'cylinder');
      if (cyl) cyl.position.x = cyl.userData.baseX + d * 0.03;
      const ham = findCached(m, 'hammer');
      if (ham) ham.rotation.x = this.cooldown > 0.25 ? -0.5 : 0;
    } else if (this.current === 'kpist') {
      const mag = findCached(m, 'magazine');
      if (mag) mag.position.y = mag.userData.baseY - Math.min(1, d * 2) * 0.25;
      const bolt = findCached(m, 'bolt');
      if (bolt) bolt.position.y = bolt.userData.baseY + (this.cooldown > 0.05 ? 0.03 : 0);
    } else if (this.current === 'shotgun') {
      const b = findCached(m, 'barrels');
      if (b) b.rotation.x = d * 0.6;
    }
  }
}

function findCached(root, name) {
  root.userData.parts ??= {};
  if (!(name in root.userData.parts)) {
    const p = findPart(root, name);
    if (p) {
      p.userData.baseX = p.position.x;
      p.userData.baseY = p.position.y;
      p.userData.baseZ = p.position.z;
    }
    root.userData.parts[name] = p;
  }
  return root.userData.parts[name];
}
