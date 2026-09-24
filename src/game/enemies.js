import * as THREE from 'three';
import { instantiateModel, findPart } from '../engine/assets.js';
import { audio } from '../engine/audio.js';
import { findPath } from './pathfinding.js';
import { ENEMY_TYPES } from './enemyTypes.js';
import { STEP_HEIGHT } from '../levels/grid.js';

// Enemy agents: perception, path following, melee / leap / ranged attacks,
// segmented-model animation (PS1 rigid parts), hit detection and death.

const tmp = new THREE.Vector3();
// Max A* searches per frame across all enemies, so packs don't cause hitches.
const PATHS_PER_FRAME = 2;
let pathBudget = PATHS_PER_FRAME;

export class Enemy {
  constructor(kind, spawn, obj) {
    this.kind = kind;
    this.cfg = ENEMY_TYPES[kind];
    this.spawnDef = spawn;
    this.obj = obj;
    this.pos = new THREE.Vector3(spawn.x, 0, spawn.z);
    this.vy = 0;
    this.leapVel = null;
    this.yaw = spawn.rot ?? Math.random() * Math.PI * 2;
    this.hp = this.cfg.hp * (spawn.hpMul ?? 1);
    this.maxHp = this.hp;
    this.dead = false;
    this.deathT = 0;
    this.alerted = !!spawn.alerted;
    this.dormant = spawn.dormant ?? null;
    this.path = null;
    this.pathTimer = Math.random() * 0.5;
    this.attackTimer = 0.6 + Math.random() * 0.6;
    this.attackAnim = 0;
    this.attackHit = false;
    this.burstLeft = 0;
    this.burstTimer = 0;
    this.leapCooldown = 2;
    this.flash = 0;
    this.phase = Math.random() * 10;
    this.moveAmt = 0;
    this.idleTimer = 0;
    this.voiceTimer = 2 + Math.random() * 6;
    this.damageMul = 1;
    this.stunned = 0;
    this.scale = spawn.scale ?? 1;
    this.parts = {};
    for (const n of ['hips', 'torso', 'head', 'arm_l', 'arm_r', 'leg_l', 'leg_r', 'body', 'tail', 'leg_fl', 'leg_fr', 'leg_bl', 'leg_br']) {
      const p = findPart(obj, n);
      if (p) this.parts[n] = { o: p, base: p.rotation.clone(), baseY: p.position.y };
    }
    this.materials = [];
    obj.traverse((o) => { if (o.isMesh) this.materials.push(o.material); });
    obj.scale.setScalar(this.scale);
    obj.visible = !this.dormant;
  }

  get active() { return !this.dormant && !this.dead; }

  eyeY() { return this.pos.y + this.cfg.height * this.scale * 0.85; }

  alert(ctx) {
    if (this.alerted || this.dead) return;
    this.alerted = true;
    this.pathTimer = 0;
    audio.play(this.cfg.sounds.alert, { pos: this.pos, volume: 0.9, rate: this.cfg.pitch * (0.9 + Math.random() * 0.2) });
    ctx?.onAlert?.(this);
  }

  hitTest(origin, dir, maxDist) {
    if (!this.active) return null;
    let best = null;
    for (const h of this.cfg.hit) {
      const r = h.r * this.scale;
      tmp.set(this.pos.x, this.pos.y + h.y * this.scale, this.pos.z).sub(origin);
      const t = tmp.dot(dir);
      if (t < 0 || t > maxDist) continue;
      const d2 = tmp.lengthSq() - t * t;
      if (d2 > r * r) continue;
      const tHit = t - Math.sqrt(r * r - d2);
      if (!best || tHit < best.dist) best = { dist: Math.max(0, tHit), part: h.part };
    }
    return best;
  }

  takeDamage(amount, ctx, part = 'body') {
    if (!this.active) return 0;
    const mul = (part === 'head' ? 2.2 : 1) * this.damageMul;
    const dmg = amount * mul;
    this.hp -= dmg;
    this.flash = 0.12;
    this.alert(ctx);
    if (this.hp <= 0) this.die(ctx);
    else if (Math.random() < 0.35) audio.play(this.cfg.sounds.pain, { pos: this.pos, volume: 0.7, rate: this.cfg.pitch * 1.1 });
    return dmg;
  }

  die(ctx) {
    this.dead = true;
    this.hp = 0;
    audio.play(this.cfg.sounds.die, { pos: this.pos, volume: 1, rate: this.cfg.pitch });
    ctx?.onDeath?.(this);
  }

  update(dt, ctx) {
    if (this.dormant) return;
    if (this.dead) { this.animateDeath(dt); return; }
    const { grid, player } = ctx;
    const cfg = this.cfg;
    this.flash = Math.max(0, this.flash - dt);
    this.stunned = Math.max(0, this.stunned - dt);
    const tint = this.flash > 0 ? [2.2, 0.7, 0.7] : this.stunned > 0 ? [1.4, 1.4, 2.2] : [1, 1, 1];
    for (const m of this.materials) m.uniforms?.uTint.value.setRGB(tint[0], tint[1], tint[2]);

    const px = player.pos.x, pz = player.pos.z;
    const dx = px - this.pos.x, dz = pz - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const dy = player.pos.y - this.pos.y;
    const seePlayer = !player.dead && dist < cfg.sight
      && grid.lineOfSight(this.pos.x, this.eyeY(), this.pos.z, px, player.pos.y + 1.5, pz);

    if (!this.alerted && seePlayer) {
      const facing = Math.cos(Math.atan2(dx, dz) - this.yaw);
      const flashlightBoost = player.flashlight ? 1.6 : 1;
      if (dist < 5 || (facing > 0.2 && dist < cfg.sight * 0.6 * flashlightBoost)) this.alert(ctx);
    }

    let moveX = 0, moveZ = 0, speed = cfg.speed * (this.stunned > 0 ? 0.25 : 1);
    this.attackTimer -= dt;
    this.leapCooldown -= dt;
    this.voiceTimer -= dt;
    if (this.voiceTimer <= 0) {
      this.voiceTimer = 4 + Math.random() * 8;
      if (this.alerted || Math.random() < 0.3) audio.play(cfg.sounds.alert, { pos: this.pos, volume: 0.5, rate: cfg.pitch * (0.85 + Math.random() * 0.3) });
    }

    if (this.alerted && !player.dead) {
      const faceTarget = Math.atan2(dx, dz);
      if (cfg.ranged) {
        this.updateRanged(dt, ctx, dist, seePlayer, faceTarget);
        if (!seePlayer || dist > cfg.range * 0.9) [moveX, moveZ] = this.followPath(dt, grid, player);
        else if (dist < 5) { moveX = -dx / dist; moveZ = -dz / dist; speed *= 0.7; }
      } else {
        const inRange = dist < cfg.range * this.scale && Math.abs(dy) < 1.4;
        if (this.attackAnim > 0 || (inRange && this.attackTimer <= 0)) {
          this.updateMelee(dt, ctx, dist, dy);
          this.turnTowards(faceTarget, dt, 10);
        } else if (cfg.leap && seePlayer && dist > 3.5 && dist < 7.5 && this.leapCooldown <= 0 && !this.leapVel && Math.abs(dy) < 1.3) {
          this.leapVel = new THREE.Vector3(dx / dist * 9.5, 4.6, dz / dist * 9.5);
          this.leapCooldown = 3 + Math.random() * 2;
          audio.play(cfg.sounds.attack, { pos: this.pos, volume: 1, rate: 1.1 });
        } else if (seePlayer && dist < 7 && Math.abs(dy) < 0.6) {
          moveX = dx / dist; moveZ = dz / dist;
          this.path = null;
        } else {
          [moveX, moveZ] = this.followPath(dt, grid, player);
        }
        if (inRange) { moveX *= 0.1; moveZ *= 0.1; }
      }
    } else {
      this.idleTimer -= dt;
      if (this.idleTimer <= 0) {
        this.idleTimer = 2 + Math.random() * 3;
        this.idleYaw = this.yaw + (Math.random() - 0.5) * 2;
      }
      if (this.idleYaw !== undefined) this.turnTowards(this.idleYaw, dt, 1.5);
    }

    this.integrate(dt, grid, moveX, moveZ, speed);
    this.animate(dt);
  }

  turnTowards(target, dt, rate) {
    let d = target - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * Math.min(1, dt * rate);
  }

  followPath(dt, grid, player) {
    this.pathTimer -= dt;
    const cx = Math.floor(this.pos.x), cz = Math.floor(this.pos.z);
    if (this.pathTimer <= 0 && pathBudget <= 0) this.pathTimer = 0.05 + Math.random() * 0.1;
    if (this.pathTimer <= 0) {
      pathBudget -= 1;
      this.pathTimer = 0.5 + Math.random() * 0.5;
      this.path = findPath(grid, cx, cz, Math.floor(player.pos.x), Math.floor(player.pos.z), {
        climb: this.cfg.climb, height: Math.min(this.cfg.height * this.scale, 2.4),
      });
    }
    if (!this.path || !this.path.length) return [0, 0];
    let [tx, tz] = this.path[0];
    if (tx === cx && tz === cz) { this.path.shift(); if (!this.path.length) return [0, 0]; [tx, tz] = this.path[0]; }
    const wx = tx + 0.5 - this.pos.x, wz = tz + 0.5 - this.pos.z;
    const l = Math.hypot(wx, wz) || 1;
    return [wx / l, wz / l];
  }

  updateMelee(dt, ctx, dist, dy) {
    if (this.attackAnim <= 0) {
      this.attackAnim = 1;
      this.attackHit = false;
      this.attackTimer = this.cfg.attackRate;
      audio.play(this.cfg.sounds.attack, { pos: this.pos, volume: 0.9, rate: this.cfg.pitch * (0.9 + Math.random() * 0.2) });
    }
    this.attackAnim = Math.max(0, this.attackAnim - dt * 2.2);
    if (!this.attackHit && this.attackAnim < 0.55) {
      this.attackHit = true;
      if (dist < this.cfg.range * this.scale * 1.25 && Math.abs(dy) < 1.5) ctx.hurtPlayer(this.cfg.damage, this);
    }
  }

  updateRanged(dt, ctx, dist, see, faceTarget) {
    if (!see) { this.burstLeft = 0; return; }
    this.turnTowards(faceTarget, dt, 6);
    this.aimT = 1;
    if (this.burstLeft > 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this.burstTimer = this.cfg.burstGap;
        this.burstLeft -= 1;
        ctx.enemyShoot(this, dist);
      }
    } else if (this.attackTimer <= 0 && dist < this.cfg.range) {
      this.attackTimer = this.cfg.attackRate + Math.random();
      this.burstLeft = this.cfg.burst;
      this.burstTimer = 0.25;
    }
  }

  integrate(dt, grid, mx, mz, speed) {
    const cfg = this.cfg;
    const r = cfg.radius * this.scale;
    const h = Math.min(cfg.height * this.scale, 2.4);
    if (this.leapVel) {
      const nx = this.pos.x + this.leapVel.x * dt, nz = this.pos.z + this.leapVel.z * dt;
      [this.pos.x, this.pos.z] = grid.collideCircle(nx, nz, r, this.pos.y + (cfg.climb - STEP_HEIGHT), h);
      this.leapVel.y -= 18 * dt;
      this.pos.y += this.leapVel.y * dt;
      const floor = grid.floorAt(this.pos.x, this.pos.z, this.pos.y + cfg.climb);
      if (this.pos.y <= floor && this.leapVel.y < 0) { this.pos.y = floor; this.leapVel = null; }
      this.moveAmt = 1;
      return;
    }
    if (mx || mz) {
      this.turnTowards(Math.atan2(mx, mz), dt, 8);
      const nx = this.pos.x + mx * speed * dt, nz = this.pos.z + mz * speed * dt;
      [this.pos.x, this.pos.z] = grid.collideCircle(nx, nz, r, this.pos.y + (cfg.climb - STEP_HEIGHT), h);
    }
    this.moveAmt += ((mx || mz ? 1 : 0) - this.moveAmt) * Math.min(1, dt * 6);
    const floor = grid.floorAt(this.pos.x, this.pos.z, this.pos.y + cfg.climb);
    if (floor > this.pos.y) this.pos.y += Math.min(floor - this.pos.y, dt * 6);
    else {
      this.vy -= 18 * dt;
      this.pos.y = Math.max(floor, this.pos.y + this.vy * dt);
      if (this.pos.y === floor) this.vy = 0;
    }
  }

  animate(dt) {
    this.phase += dt * (4 + this.cfg.speed * 1.4) * this.moveAmt;
    const s = Math.sin(this.phase);
    const P = this.parts;
    const set = (n, rx = 0, ry = 0, rz = 0) => {
      const p = P[n];
      if (p) p.o.rotation.set(p.base.x + rx, p.base.y + ry, p.base.z + rz);
    };
    const a = this.attackAnim > 0 ? Math.sin((1 - this.attackAnim) * Math.PI) : 0;
    if (this.cfg.rig === 'quad') {
      set('leg_fl', s * 0.8 * this.moveAmt);
      set('leg_br', s * 0.8 * this.moveAmt);
      set('leg_fr', -s * 0.8 * this.moveAmt);
      set('leg_bl', -s * 0.8 * this.moveAmt);
      set('tail', 0, Math.sin(this.phase * 0.7 + 1) * 0.5, 0);
      set('head', -a * 0.6 + Math.sin(this.phase * 2) * 0.05);
    } else {
      const m = this.moveAmt;
      const aim = this.cfg.ranged && this.alerted ? 1 : 0;
      const hunch = this.kind === 'pale' ? 0.45 : this.kind === 'troll' ? 0.3 : this.kind === 'mother' ? 0.15 : 0;
      set('leg_l', s * 0.7 * m);
      set('leg_r', -s * 0.7 * m);
      set('torso', hunch + Math.abs(s) * 0.05 * m + a * 0.3, Math.sin(this.phase * 0.5) * 0.05);
      if (this.cfg.ranged) {
        // The raider model already holds its rifle at the ready in rest pose:
        // aim = rest, otherwise carry it slightly lowered with a small sway.
        const carry = aim ? 0 : 0.35 + s * 0.08 * m;
        set('arm_l', carry);
        set('arm_r', carry);
      } else {
        set('arm_l', -s * 0.6 * m - a * 1.8);
        set('arm_r', s * 0.6 * m - a * 2.0);
      }
      set('head', -hunch * 0.8 + Math.sin(this.phase * 0.3) * 0.1);
      if (P.hips) P.hips.o.position.y = P.hips.baseY + Math.abs(s) * 0.04 * m;
    }
    this.syncObj();
  }

  animateDeath(dt) {
    if (this.deathT >= 1) return;
    this.deathT = Math.min(1, this.deathT + dt * 2.2);
    const t = this.deathT;
    const quad = this.cfg.rig === 'quad';
    // Fall backwards in the creature's own frame; relax limbs to rest pose.
    this.obj.rotation.set(quad ? 0 : -t * Math.PI / 2, this.yaw, quad ? t * Math.PI / 2 : 0, 'YXZ');
    this.obj.position.set(this.pos.x, this.pos.y + t * 0.22 * this.scale, this.pos.z);
    for (const p of Object.values(this.parts)) {
      p.o.rotation.x += (p.base.x + (p.o === this.parts.arm_l?.o || p.o === this.parts.arm_r?.o ? -2.2 : 0) - p.o.rotation.x) * Math.min(1, dt * 6);
      p.o.rotation.y += (p.base.y - p.o.rotation.y) * Math.min(1, dt * 6);
      p.o.rotation.z += (p.base.z - p.o.rotation.z) * Math.min(1, dt * 6);
    }
    for (const m of this.materials) m.uniforms?.uTint.value.setRGB(1 - t * 0.4, 1 - t * 0.5, 1 - t * 0.5);
    if (t >= 1) this.onDeathSettled?.(this);
  }

  syncObj() {
    this.obj.position.copy(this.pos);
    this.obj.rotation.set(0, this.yaw, 0, 'YXZ');
  }
}

export class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'enemies';
    this.list = [];
  }

  reset() {
    this.scene.remove(this.group);
    this.group = new THREE.Group();
    this.group.name = 'enemies';
    this.scene.add(this.group);
    this.list = [];
  }

  async spawn(def, grid) {
    const cfg = ENEMY_TYPES[def.kind];
    const obj = await instantiateModel(cfg.model, { unique: true });
    const e = new Enemy(def.kind, def, obj);
    e.pos.y = grid.floorAt(def.x, def.z);
    e.syncObj();
    this.group.add(obj);
    this.list.push(e);
    return e;
  }

  activate(group, ctx) {
    for (const e of this.list) {
      if (e.dormant === group) {
        e.dormant = null;
        e.obj.visible = true;
        e.alert(ctx);
      }
    }
  }

  alive(group = undefined) {
    return this.list.filter((e) => !e.dead && (group === undefined || e.spawnDef.dormant === group || e.spawnDef.group === group));
  }

  alertNear(pos, radius, ctx) {
    for (const e of this.list) {
      if (e.active && e.pos.distanceTo(pos) < radius) e.alert(ctx);
    }
  }

  raycast(origin, dir, maxDist) {
    let best = null;
    for (const e of this.list) {
      const h = e.hitTest(origin, dir, maxDist);
      if (h && (!best || h.dist < best.dist)) best = { ...h, enemy: e };
    }
    return best;
  }

  update(dt, ctx) {
    pathBudget = PATHS_PER_FRAME;
    for (const e of this.list) e.update(dt, ctx);
    // Simple separation so packs don't stack.
    const act = this.list.filter((e) => e.active);
    for (let i = 0; i < act.length; i++) {
      for (let j = i + 1; j < act.length; j++) {
        const a = act[i], b = act[j];
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const min = (a.cfg.radius * a.scale + b.cfg.radius * b.scale) * 0.9;
        const d = Math.hypot(dx, dz);
        if (d > 0.001 && d < min) {
          const push = (min - d) / 2;
          a.pos.x -= (dx / d) * push; a.pos.z -= (dz / d) * push;
          b.pos.x += (dx / d) * push; b.pos.z += (dz / d) * push;
        }
      }
    }
  }
}
