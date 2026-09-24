import * as THREE from 'three';
import { STEP_HEIGHT } from '../levels/grid.js';

// First-person player: movement, collision against the level grid, stats
// (health, gas mask filters, flashlight battery) and camera bob.

const RADIUS = 0.3;
const STAND_H = 1.72;
const CROUCH_H = 1.1;
const GRAVITY = 19;
const JUMP_V = 5.8;

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.height = STAND_H;
    this.eyeSmooth = 0;
    this.grounded = false;
    this.crouching = false;
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.stepAccum = 0;
    this.landImpact = 0;
    this.maxHealth = 100;
    this.health = 100;
    this.dead = false;
    this.hurtTimer = 0;
    this.maskOn = false;
    this.maskHealth = 100;
    this.filterTime = 120;
    this.filters = 1;
    this.battery = 1;
    this.flashlight = true;
    this.cranking = false;
    this.speedMul = 1;
    this.onStep = null;
    this.onLand = null;
  }

  spawn(x, y, z, yaw = 0) {
    this.pos.set(x, y, z);
    this.vel.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.eyeSmooth = y;
    this.dead = false;
  }

  get eye() {
    return new THREE.Vector3(this.pos.x, this.eyeSmooth + this.height - 0.1, this.pos.z);
  }

  forward() {
    return new THREE.Vector3(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch));
  }

  look(dx, dy) {
    this.yaw -= dx * 0.0022;
    this.pitch -= dy * 0.0022;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch));
  }

  update(dt, input, grid) {
    if (this.dead) {
      this.eyeSmooth += (this.pos.y - 1.3 - this.eyeSmooth) * Math.min(1, dt * 3);
      this.updateCamera(dt);
      return;
    }
    // Crouch
    const wantCrouch = input.isDown('KeyC') || input.isDown('ControlLeft');
    if (wantCrouch) this.crouching = true;
    else if (this.crouching && grid.ceilAt(this.pos.x, this.pos.z) > this.pos.y + STAND_H + 0.05) this.crouching = false;
    const targetH = this.crouching ? CROUCH_H : STAND_H;
    this.height += (targetH - this.height) * Math.min(1, dt * 10);

    // Wish direction
    let fx = 0, fz = 0;
    if (input.isDown('KeyW')) fz -= 1;
    if (input.isDown('KeyS')) fz += 1;
    if (input.isDown('KeyA')) fx -= 1;
    if (input.isDown('KeyD')) fx += 1;
    const len = Math.hypot(fx, fz) || 1;
    fx /= len; fz /= len;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    const wx = fx * cos + fz * sin;
    const wz = -fx * sin + fz * cos;
    const sprint = input.isDown('ShiftLeft') && !this.crouching && fz < 0;
    let speed = this.crouching ? 2.0 : sprint ? 6.4 : 4.0;
    if (this.cranking) speed *= 0.5;
    speed *= this.speedMul;

    const accel = this.grounded ? 12 : 2.5;
    this.vel.x += (wx * speed - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (wz * speed - this.vel.z) * Math.min(1, accel * dt);

    if (this.grounded && input.wasPressed('Space')) {
      this.vel.y = JUMP_V;
      this.grounded = false;
    }
    this.vel.y -= GRAVITY * dt;

    // Horizontal move with collision
    const nx = this.pos.x + this.vel.x * dt;
    const nz = this.pos.z + this.vel.z * dt;
    const [cx, cz] = grid.collideCircle(nx, nz, RADIUS, this.pos.y, this.height);
    this.pos.x = cx;
    this.pos.z = cz;

    // Vertical: ground = highest floor under the body within step reach.
    const reach = this.pos.y + STEP_HEIGHT;
    let ground = -Infinity;
    for (const [ox, oz] of [[0, 0], [RADIUS * 0.7, 0], [-RADIUS * 0.7, 0], [0, RADIUS * 0.7], [0, -RADIUS * 0.7]]) {
      const f = grid.floorAt(this.pos.x + ox, this.pos.z + oz, reach);
      if (f <= reach && f > ground) ground = f;
    }
    const wasGrounded = this.grounded;
    const prevVy = this.vel.y;
    this.pos.y += this.vel.y * dt;
    if (this.pos.y <= ground) {
      this.pos.y = ground;
      if (!wasGrounded && prevVy < -4) {
        this.landImpact = Math.min(0.25, -prevVy * 0.025);
        this.onLand?.(-prevVy);
      }
      this.vel.y = 0;
      this.grounded = true;
    } else if (this.pos.y > ground + 0.05) {
      this.grounded = false;
    }
    // Ceiling
    const ceil = grid.ceilAt(this.pos.x, this.pos.z);
    if (this.pos.y + this.height > ceil && this.vel.y > 0) this.vel.y = 0;

    // Smooth eye height over steps
    this.eyeSmooth += (this.pos.y - this.eyeSmooth) * Math.min(1, dt * 14);
    if (Math.abs(this.pos.y - this.eyeSmooth) > 1.2) this.eyeSmooth = this.pos.y;

    // Head bob + footsteps
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    const moving = this.grounded && hSpeed > 0.5;
    this.bobAmount += ((moving ? Math.min(1, hSpeed / 4) : 0) - this.bobAmount) * Math.min(1, dt * 8);
    if (moving) {
      this.bobPhase += dt * hSpeed * 2.1;
      this.stepAccum += hSpeed * dt;
      const stride = sprint ? 2.1 : 1.7;
      if (this.stepAccum > stride) {
        this.stepAccum = 0;
        this.onStep?.(grid.cellAt(this.pos.x, this.pos.z), sprint);
      }
    }
    this.landImpact = Math.max(0, this.landImpact - dt * 1.2);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.updateCamera(dt);
  }

  updateCamera() {
    const bobY = Math.abs(Math.sin(this.bobPhase)) * 0.06 * this.bobAmount - this.landImpact;
    const bobX = Math.cos(this.bobPhase) * 0.035 * this.bobAmount;
    const e = this.eye;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    this.camera.position.set(e.x + cos * bobX, e.y + bobY, e.z - sin * bobX);
    this.camera.rotation.set(this.pitch, this.yaw, this.dead ? 0.5 : 0, 'YXZ');
  }

  damage(amount) {
    if (this.dead) return false;
    this.health = Math.max(0, this.health - amount);
    this.hurtTimer = 0.4;
    if (this.maskOn) this.maskHealth = Math.max(0, this.maskHealth - amount * 0.35);
    if (this.health <= 0) this.dead = true;
    return true;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }
}
