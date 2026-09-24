import * as THREE from 'three';
import { audio } from '../engine/audio.js';
import { WEAPONS } from './weapons.js';
import { PICKUPS } from './entities.js';
import { COL } from './hud.js';

// Per-frame gameplay rules that sit between the player, weapons, enemies
// and the level: shooting, melee, interaction, pickups, triggers, survival.

const tmpDir = new THREE.Vector3();

export function enemyContext(game) {
  return {
    grid: game.world.grid,
    player: game.player,
    hurtPlayer: (dmg, enemy) => hurtPlayer(game, dmg, enemy),
    enemyShoot: (enemy, dist) => enemyShoot(game, enemy, dist),
    onAlert: () => { game.combatTimer = 8; },
    onDeath: (enemy) => {
      game.effects.bloodPool(enemy.pos);
      game.killed.add(enemy.spawnDef.index);
      game.stats.kills += 1;
      if (enemy.cfg.reward) {
        game.money += enemy.cfg.reward;
        game.hud.message(`+${enemy.cfg.reward} MP`, '#d8b860', 2);
      }
      game.script?.onKill?.(game, enemy);
    },
  };
}

export function hurtPlayer(game, dmg, enemy) {
  const p = game.player;
  if (p.dead || game.godMode) return;
  const scaled = dmg * (game.difficulty ?? 1);
  p.damage(scaled);
  audio.play(p.dead ? 'player_die' : Math.random() < 0.5 ? 'player_hurt_1' : 'player_hurt_2', { volume: 0.9 });
  if (enemy) game.effects.impact(p.eye.clone().add(new THREE.Vector3(0, -0.4, 0)), { x: 0, y: 1, z: 0 }, 'flesh');
  if (p.dead) game.onPlayerDeath();
}

function enemyShoot(game, enemy, dist) {
  const p = game.player;
  const muzzle = new THREE.Vector3(enemy.pos.x + Math.sin(enemy.yaw) * 0.5, enemy.pos.y + 1.45, enemy.pos.z + Math.cos(enemy.yaw) * 0.5);
  audio.play('shot_kpist', { pos: muzzle, volume: 0.8, rate: 0.9 + Math.random() * 0.15 });
  game.effects.muzzleLight(muzzle, 0xffb060, 1.6, 7);
  const moving = Math.hypot(p.vel.x, p.vel.z) > 3;
  let chance = Math.max(0.12, Math.min(0.7, 0.8 - dist * 0.035));
  if (moving) chance *= 0.6;
  if (p.crouching) chance *= 0.75;
  const target = p.eye.clone().add(new THREE.Vector3(0, -0.3, 0));
  if (Math.random() < chance) {
    game.effects.tracer(muzzle, target);
    hurtPlayer(game, enemy.cfg.damage, null);
  } else {
    const miss = target.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2.5, (Math.random() - 0.3) * 1.5, (Math.random() - 0.5) * 2.5));
    game.effects.tracer(muzzle, miss);
    if (Math.random() < 0.4) audio.play('ricochet', { pos: miss, volume: 0.6 });
  }
}

export function handleWeapons(game, dt, mouse) {
  const { input, arsenal, player } = game;
  if (player.dead) return;
  for (const [id, w] of Object.entries(WEAPONS)) {
    if (input.wasPressed(`Digit${w.slot}`)) arsenal.select(id);
  }
  if (input.wheel) arsenal.cycle(input.wheel > 0 ? 1 : -1);
  if (input.wasPressed('KeyR')) arsenal.startReload();
  if (input.wasPressed('KeyQ') && arsenal.current !== 'knife') quickMelee(game);
  const held = input.mouseDown[0] && !player.cranking;
  const pressed = input.mousePressed[0] && !player.cranking;
  const shot = arsenal.tryFire(held, pressed);
  if (shot) fire(game, shot.weapon);
  arsenal.update(dt, player, mouse);
}

function quickMelee(game) {
  if (game.quickMeleeCd > 0) return;
  game.quickMeleeCd = 0.6;
  game.arsenal.melee = 1;
  audio.play('knife_swing', { volume: 0.7 });
  meleeHit(game, WEAPONS.knife);
}

function fire(game, w) {
  if (w.melee) { meleeHit(game, w); return; }
  const { player, camera, effects } = game;
  const origin = camera.position.clone();
  const fwd = player.forward();
  effects.muzzleLight(origin.clone().addScaledVector(fwd, 0.8));
  game.enemies.alertNear(origin, 28, enemyContext(game));
  player.pitch = Math.min(1.45, player.pitch + w.recoil * 0.35);
  player.yaw += (Math.random() - 0.5) * w.recoil * 0.15;
  const moving = Math.hypot(player.vel.x, player.vel.z) > 3 ? 1.6 : 1;
  const spread = w.spread * moving * (player.crouching ? 0.7 : 1);
  let hitAny = false;
  for (let i = 0; i < w.pellets; i++) {
    tmpDir.copy(fwd);
    tmpDir.x += (Math.random() - 0.5) * 2 * spread;
    tmpDir.y += (Math.random() - 0.5) * 2 * spread;
    tmpDir.z += (Math.random() - 0.5) * 2 * spread;
    tmpDir.normalize();
    if (hitscan(game, origin, tmpDir.clone(), w.damage, 60)) hitAny = true;
  }
  if (hitAny) game.hud.hitMarker = 0.15;
}

function hitscan(game, origin, dir, damage, maxDist) {
  const wall = game.world.grid.raycast(origin.x, origin.y, origin.z, dir.x, dir.y, dir.z, maxDist);
  const wallDist = wall ? wall.dist : maxDist;
  const hit = game.enemies.raycast(origin, dir, wallDist);
  if (hit) {
    const falloff = hit.dist > 12 ? Math.max(0.4, 1 - (hit.dist - 12) / 30) : 1;
    hit.enemy.takeDamage(damage * falloff, enemyContext(game), hit.part);
    const p = origin.clone().addScaledVector(dir, hit.dist);
    game.effects.impact(p, { x: -dir.x, y: -dir.y, z: -dir.z }, 'flesh');
    audio.play('impact_flesh', { pos: p, volume: 0.7 });
    return true;
  }
  if (wall) {
    game.effects.impact(wall.point, wall.normal, 'rock');
    if (Math.random() < 0.3) audio.play('impact_rock', { pos: new THREE.Vector3(wall.point.x, wall.point.y, wall.point.z), volume: 0.5 });
  }
  return false;
}

function meleeHit(game, w) {
  const origin = game.camera.position.clone();
  const fwd = game.player.forward();
  const hit = game.enemies.raycast(origin, fwd, w.range);
  // Forgiving melee: also try a slightly lowered ray for short creatures.
  const low = hit ?? game.enemies.raycast(origin, fwd.clone().add(new THREE.Vector3(0, -0.35, 0)).normalize(), w.range);
  if (low) {
    game.later(0.08, () => {
      low.enemy.takeDamage(w.damage, enemyContext(game), low.part);
      audio.play('knife_hit', { volume: 0.8 });
      game.effects.impact(origin.clone().addScaledVector(fwd, low.dist), { x: -fwd.x, y: -fwd.y, z: -fwd.z }, 'flesh');
      game.hud.hitMarker = 0.15;
    });
  }
}

export function handleSurvival(game, dt) {
  const { input, player, hud } = game;
  if (player.dead) return;
  if (input.wasPressed('KeyF')) {
    player.flashlight = !player.flashlight;
    audio.play('flashlight', { volume: 0.6 });
  }
  // Dynamo crank
  player.cranking = input.isDown('KeyV');
  if (player.cranking) {
    player.battery = Math.min(1, player.battery + dt * 0.22);
    if (!game.dynamoSound) game.dynamoSound = audio.play('dynamo', { loop: true, volume: 0.5 });
  } else if (game.dynamoSound) {
    game.dynamoSound.stop();
    game.dynamoSound = null;
  }
  if (player.flashlight) {
    player.battery = Math.max(0, player.battery - dt / 200);
    if (player.battery === 0 && !game.warnedBattery) { hud.message('Batteriet är slut. Håll V för att veva dynamon.', COL.warn); game.warnedBattery = true; }
  }
  if (player.battery > 0.1) game.warnedBattery = false;
  // Gas mask
  if (input.wasPressed('KeyG')) toggleMask(game);
  if (input.wasPressed('KeyH')) useMedkit(game);
  const toxic = game.inToxic;
  if (player.maskOn) {
    player.filterTime -= dt;
    if (player.filterTime <= 0) {
      if (player.filters > 0) {
        player.filters -= 1;
        player.filterTime = 120;
        audio.play('filter_change', { volume: 0.8 });
        hud.message('Nytt filter isatt.', COL.good);
      } else {
        player.filterTime = 0;
      }
    }
  }
  const breathing = toxic && (!player.maskOn || player.filterTime <= 0 || player.maskHealth <= 0);
  if (breathing) {
    game.toxicDamage += dt;
    if (game.toxicDamage > 1) {
      game.toxicDamage = 0;
      hurtPlayer(game, 7, null);
      if (!player.maskOn) hud.message('Luften är giftig! Tryck G för gasmask.', COL.bad, 1.5);
      else if (player.maskHealth <= 0) hud.message('Masken är trasig!', COL.bad, 1.5);
      else hud.message('Filtret är slut!', COL.bad, 1.5);
    }
  }
  if (player.maskOn && !game.breathSound) game.breathSound = audio.play('mask_breath', { loop: true, volume: 0.45 });
  if (!player.maskOn && game.breathSound) { game.breathSound.stop(); game.breathSound = null; }
  // Low health heartbeat
  game.heartT -= dt;
  if (player.health < 30 && game.heartT <= 0) {
    game.heartT = 0.9;
    audio.play('heartbeat', { volume: 0.6 });
  }
}

function toggleMask(game) {
  const p = game.player;
  p.maskOn = !p.maskOn;
  audio.play(p.maskOn ? 'mask_on' : 'mask_off', { volume: 0.8 });
  if (p.maskOn && p.filterTime <= 0 && p.filters > 0) {
    p.filters -= 1;
    p.filterTime = 120;
  }
}

function useMedkit(game) {
  const p = game.player;
  if (game.medkits <= 0) { game.hud.message('Inga förbandslådor.', COL.dim, 2); return; }
  if (p.health >= p.maxHealth) { game.hud.message('Du är inte skadad.', COL.dim, 2); return; }
  game.medkits -= 1;
  p.heal(45);
  audio.play('pickup', { volume: 0.7, rate: 0.8 });
  game.hud.message('+45 hälsa', COL.good, 2);
}

export function handleInteraction(game) {
  const { player, input, hud } = game;
  hud.prompt = '';
  if (player.dead) return;
  const eye = player.eye;
  let best = null;
  let bestD = 2.4;
  const fwd = player.forward();
  const consider = (x, y, z, item) => {
    const d = Math.hypot(x - eye.x, z - eye.z);
    if (d > bestD) return;
    const dirx = (x - eye.x) / (d || 1), dirz = (z - eye.z) / (d || 1);
    if (d > 0.8 && dirx * fwd.x + dirz * fwd.z < 0.55) return;
    if (Math.abs(y - player.pos.y) > 2) return;
    best = item;
    bestD = d;
  };
  for (const npc of game.npcs) {
    if (!npc.hidden) consider(npc.pos.x, npc.obj.position.y, npc.pos.z, { label: `[E] Prata med ${npc.name}`, act: () => game.talkTo(npc) });
  }
  for (const u of game.world.spawns.interactables) {
    if (u.done || (u.visible && !u.visible(game))) continue;
    consider(u.x, u.y ?? game.world.grid.floorAt(u.x, u.z), u.z, { label: `[E] ${u.label}`, act: () => game.script?.use?.(game, u) });
  }
  if (best) {
    hud.prompt = best.label;
    if (input.wasPressed('KeyE')) best.act();
  }
}

export function handlePickups(game) {
  const p = game.player;
  for (const pk of game.pickups) {
    if (pk.taken) continue;
    const d = Math.hypot(pk.obj.position.x - p.pos.x, pk.obj.position.z - p.pos.z);
    if (d < 1.0 && Math.abs(pk.baseY - p.pos.y) < 1.4) {
      pk.taken = true;
      pk.obj.visible = false;
      game.takenPickups.add(pk.def.index);
      const kind = PICKUPS[pk.def.kind];
      kind.apply(game, pk.def);
      audio.play('pickup', { volume: 0.8 });
      game.hud.message(`+ ${kind.label}${pk.def.amount ? ` (${pk.def.amount})` : ''}`, '#d8c890', 3);
    }
  }
}

export function handleTriggers(game) {
  const p = game.player;
  game.inToxic = false;
  for (const t of game.world.spawns.triggers) {
    const [x0, z0, x1, z1] = t.rect;
    const inside = p.pos.x >= x0 && p.pos.x <= x1 + 1 && p.pos.z >= z0 && p.pos.z <= z1 + 1;
    if (t.toxic && inside && !game.flags[`clean_${t.id}`]) game.inToxic = true;
    const entered = inside && !t.inside;
    t.inside = inside;
    if ((t.repeat || t.id === 'exit') && entered) t.fired = false;
    if (inside && !t.fired) {
      if (!t.persistent) t.fired = true;
      if (!t.toxic) game.script?.trigger?.(game, t.id, t);
      else if (!t.warned) {
        t.warned = true;
        if (!p.maskOn) game.hud.message('Det luktar giftigt här. Tryck G för gasmasken!', COL.warn, 4);
      }
    }
  }
}
