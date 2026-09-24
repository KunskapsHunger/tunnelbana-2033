import * as THREE from 'three';
import { PS1Renderer } from '../engine/renderer.js';
import { sharedUniforms } from '../engine/ps1Material.js';
import { Input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { materialFor } from '../engine/assets.js';
import { Player } from './player.js';
import { LightManager } from './lights.js';
import { buildWorld } from './world.js';
import { Effects } from './effects.js';
import { Arsenal } from './weapons.js';
import { EnemyManager } from './enemies.js';
import { HUD } from './hud.js';
import { UI } from './ui.js';
import { SaveStore } from './save.js';
import { spawnNPC, spawnPickup } from './entities.js';
import { enemyContext, handleWeapons, handleSurvival, handleInteraction, handlePickups, handleTriggers } from './gameplay.js';
import { LEVELS, LEVEL_ORDER } from '../levels/index.js';
import { SCRIPTS } from '../story/index.js';
import { SHOPS } from '../story/shops.js';

// Top-level game object: owns renderer, scene, systems and the main loop.

const DEATH_QUOTES = [
  'Mörkret glömmer ingen.',
  'Tunneln tog en till.',
  'Ingen kommer att sjunga om dig.',
  'Solna väntar förgäves.',
];

const DEFAULT_EVENTS = [
  { name: 'pale_screech', volume: 0.35, rate: 0.6 },
  { name: 'rat_squeak', volume: 0.4, rate: 0.8 },
  { name: 'gate_open', volume: 0.3, rate: 0.7 },
  { name: 'troll_roar', volume: 0.3, rate: 0.8 },
  { name: 'impact_rock', volume: 0.5, rate: 0.6 },
];

const LOADING_TIPS = [
  'Håll V för att veva ficklampans dynamo. Du går långsamt medan du vevar.',
  'De Bleka ser ficklampan på långt håll. Släck den med F för att smyga.',
  'Huvudskott gör mer än dubbel skada.',
  'Militärpatroner (MP) är valuta i tunnelbanan. Plundrare bär ofta på några.',
  'Gasmaskens filter räcker två minuter. Masken spricker om du tar skada.',
  'Hesa Fredrik testas första helgfria måndagen i mars, juni, september och december. Testades.',
];

export class Game {
  constructor(glCanvas, hudCanvas) {
    this.ps1 = new PS1Renderer(glCanvas);
    this.hudCanvas = hudCanvas;
    this.input = new Input(glCanvas);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, this.ps1.aspect, 0.05, 80);
    this.viewScene = new THREE.Scene();
    this.viewCamera = new THREE.PerspectiveCamera(62, this.ps1.aspect, 0.01, 10);
    this.viewScene.add(this.viewCamera);
    this.lights = new LightManager();
    this.player = new Player(this.camera);
    this.effects = new Effects(this.scene, this.lights);
    this.enemies = new EnemyManager(this.scene);
    this.arsenal = new Arsenal(this.viewCamera);
    this.hud = new HUD(hudCanvas);
    this.ui = new UI(this);
    this.save = new SaveStore();
    this.settings = this.save.loadSettings();
    this.audio = audio;
    this.world = null;
    this.script = null;
    this.npcs = [];
    this.pickups = [];
    this.timers = [];
    this.flags = {};
    this.money = 25;
    this.medkits = 1;
    this.killed = new Set();
    this.takenPickups = new Set();
    this.stats = { kills: 0 };
    this.state = 'boot';
    this.time = 0;
    this.last = performance.now();
    this.combatTimer = 0;
    this.quickMeleeCd = 0;
    this.heartT = 0;
    this.toxicDamage = 0;
    this.inToxic = false;
    this.deathTimer = 0;
    this.titleCam = 0;
    this.loadToken = 0;

    this.player.onStep = (cell, sprint) => {
      const surface = cell?.ft === 'track_bed' ? 'gravel' : cell?.ft === 'metal_grate' ? 'metal' : 'concrete';
      const n = surface === 'metal' ? 1 + Math.floor(Math.random() * 2) : 1 + Math.floor(Math.random() * 4);
      audio.play(`step_${surface}_${n}`, { volume: sprint ? 0.55 : 0.4, rate: 0.9 + Math.random() * 0.2 });
    };
    this.player.onLand = () => audio.play('jump_land', { volume: 0.6 });

    window.addEventListener('resize', () => this.onResize());
    glCanvas.addEventListener('click', () => {
      audio.unlock();
      if (this.state === 'play' && !this.ui.screen) this.input.requestLock();
    });
    window.addEventListener('keydown', () => audio.unlock(), { once: true });
    this.input.onLockChange = (locked) => {
      if (!locked && this.state === 'play' && !this.ui.screen && !this.player.dead) this.pause();
    };
    this.applySettings();
    this.onResize();
  }

  // ---- Setup / settings ----------------------------------------------------

  onResize() {
    this.ps1.resize();
    this.camera.aspect = this.ps1.aspect;
    this.camera.updateProjectionMatrix();
    this.viewCamera.aspect = this.ps1.aspect;
    this.viewCamera.updateProjectionMatrix();
    // HUD always stays at 240 lines so text keeps its chunky size.
    this.hudCanvas.width = Math.round(240 * this.ps1.aspect);
    this.hudCanvas.height = 240;
    if (this.settings) this.applySnap();
  }

  applySettings() {
    const s = this.settings;
    this.input.sensitivity = s.sensitivity;
    audio.volumes.master = s.volume;
    audio.volumes.music = s.music;
    audio.applyVolumes();
    if (this.ps1.internalHeight !== s.resolution) {
      this.ps1.setInternalHeight(s.resolution);
      this.onResize();
    }
    this.applySnap();
    this.difficulty = [0.55, 1, 1.5][s.difficulty] ?? 1;
    sharedUniforms.uAffine.value = s.affine ? 0.85 : 0;
    this.ps1.postUniforms.uGamma.value = 0.95 - s.brightness * 0.45;
    this.ps1.postUniforms.uDither.value = s.dither ? 1 : 0;
    this.ps1.postUniforms.uLevels.value = s.dither ? 31 : 255;
  }

  // Vertex snap grid: half the internal resolution gives the PS1 wobble.
  applySnap() {
    const on = this.settings.jitter;
    sharedUniforms.uSnap.value.set(on ? this.ps1.width / 2 : 4000, on ? this.ps1.height / 2 : 4000);
  }

  saveSettings() {
    this.save.storeSettings(this.settings);
  }

  async boot() {
    this.ui.open({ type: 'loading', title: 'TUNNELBANA 2033' });
    await this.arsenal.load();
    await this.loadLevel('solna', { title: true });
    this.state = 'title';
    this.ui.open({ type: 'title' });
    audio.playMusic('music_menu');
  }

  // ---- Flow ------------------------------------------------------------------

  newGame() {
    this.save.clear();
    this.flags = {};
    this.money = 25;
    this.medkits = 1;
    this.stats = { kills: 0 };
    this.player.health = 100;
    this.player.filters = 1;
    this.player.filterTime = 120;
    this.player.maskHealth = 100;
    this.player.battery = 1;
    this.arsenal.fromSave({ owned: ['knife', 'revolver'], magazine: { knife: 0, revolver: 6, kpist: 0, shotgun: 0 }, reserve: { rev: 18, '9mm': 0, shells: 0 }, current: 'revolver' });
    this.startLevel('solna');
  }

  continueGame() {
    const s = this.save.load();
    if (!s) { this.newGame(); return; }
    this.flags = { ...s.flags };
    this.money = s.money;
    this.medkits = s.medkits;
    this.stats = { ...(s.stats ?? { kills: 0 }) };
    this.player.health = s.health;
    this.player.filters = s.filters;
    this.player.filterTime = s.filterTime;
    this.player.maskHealth = s.maskHealth;
    this.player.battery = s.battery ?? 1;
    this.arsenal.fromSave(s.arsenal);
    this.startLevel(s.level, { pos: s.pos, killed: s.killed, taken: s.taken });
  }

  async startLevel(id, restore = {}) {
    this.ui.open({ type: 'loading', title: LEVELS[id].title, tip: LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)] });
    this.state = 'loading';
    this.input.exitLock();
    await this.loadLevel(id, restore);
    this.ui.close();
    this.state = 'play';
    this.player.dead = false;
    this.player.maskOn = false;
    if (this.player.health <= 0) this.player.health = 50;
    audio.playMusic(this.world.def.music ?? null);
    audio.playAmbience(this.world.def.ambience ?? null);
    this.soundSources = (this.world.def.sounds ?? []).map((s) => audio.play(s.name, {
      pos: new THREE.Vector3(s.x, s.y ?? 1.5, s.z), loop: true, volume: s.volume ?? 0.6,
      refDistance: s.refDistance ?? 2.5, maxDistance: s.maxDistance ?? 30, bus: s.bus ?? 'sfx',
    }));
    this.script?.onStart?.(this);
    if (!restore.pos) this.checkpoint();
    this.input.requestLock();
  }

  async loadLevel(id, restore = {}) {
    const token = ++this.loadToken;
    const def = LEVELS[id];
    this.script?.onLeave?.(this);
    for (const s of this.soundSources ?? []) s?.stop(0.5);
    this.soundSources = [];
    this.boss = null;
    this.dynamoSound?.stop();
    this.breathSound?.stop();
    this.dynamoSound = null;
    this.breathSound = null;
    if (this.world) this.scene.remove(this.world.root);
    this.lights.clear();
    this.effects.reset();
    this.enemies.reset();
    this.timers = [];
    this.npcs = [];
    this.pickups = [];
    this.killed = new Set(restore.killed ?? []);
    this.takenPickups = new Set(restore.taken ?? []);
    const world = await buildWorld(def, this.lights);
    if (token !== this.loadToken) return;
    this.world = world;
    this.levelId = id;
    this.script = SCRIPTS[id] ?? null;
    this.scene.add(world.root);
    const a = def.ambient ?? [0.08, 0.08, 0.08];
    sharedUniforms.uAmbient.value.setRGB(a[0], a[1], a[2]);
    sharedUniforms.uFogNear.value = def.fog?.near ?? 4;
    sharedUniforms.uFogFar.value = def.fog?.far ?? 30;
    const sp = world.spawns;
    const tasks = [];
    sp.enemies.forEach((e, i) => {
      e.index = i;
      if (!restore.title && !this.killed.has(i)) tasks.push(this.enemies.spawn(e, world.grid));
    });
    sp.pickups.forEach((p, i) => {
      p.index = i;
      if (!this.takenPickups.has(i)) tasks.push(spawnPickup(p, world.grid, world.root).then((pk) => this.pickups.push(pk)));
    });
    for (const n of sp.npcs) tasks.push(spawnNPC(n, world.grid, world.root).then((npc) => this.npcs.push(npc)));
    await Promise.all(tasks);
    const pos = restore.pos ?? def.spawn;
    this.player.spawn(pos.x, world.grid.floorAt(pos.x, pos.z), pos.z, pos.yaw ?? def.spawn.yaw ?? 0);
  }

  checkpoint() {
    if (!this.world) return;
    const p = this.player;
    this.save.store({
      level: this.levelId,
      pos: { x: p.pos.x, z: p.pos.z, yaw: p.yaw },
      health: Math.max(p.health, 40),
      filters: p.filters,
      filterTime: p.filterTime,
      maskHealth: p.maskHealth,
      battery: p.battery,
      money: this.money,
      medkits: this.medkits,
      arsenal: this.arsenal.toSave(),
      flags: { ...this.flags },
      killed: [...this.killed],
      taken: [...this.takenPickups],
      stats: { ...this.stats },
    });
    this.hud.message('Kontrollpunkt sparad.', '#7a7262', 2);
  }

  nextLevel() {
    const i = LEVEL_ORDER.indexOf(this.levelId);
    const next = this.world.def.next ?? LEVEL_ORDER[i + 1];
    if (!next || !LEVELS[next]) { this.ending(); return; }
    this.killed = new Set();
    this.takenPickups = new Set();
    this.startLevel(next);
  }

  pause() {
    if (this.state !== 'play' || this.ui.screen) return;
    this.input.exitLock();
    this.ui.open({ type: 'pause' });
  }

  resume() {
    this.ui.close();
    this.input.requestLock();
  }

  toTitle() {
    this.input.exitLock();
    audio.playAmbience(null);
    this.boot();
  }

  onPlayerDeath() {
    this.deathTimer = 1.8;
    audio.playMusic(null);
  }

  ending(lines) {
    this.input.exitLock();
    this.state = 'play';
    this.save.clear();
    const mins = Math.floor((this.stats.time ?? 0) / 60);
    const stats = `Varelser dödade: ${this.stats.kills}   Speltid: ${mins} min`;
    this.ui.open({ type: 'ending', lines: [...(lines ?? ['SLUT']), stats] });
  }

  // ---- Script API --------------------------------------------------------------

  say(lines, onDone) {
    this.ui.open({ type: 'dialog', lines, index: 0, onDone });
    return true;
  }

  later(seconds, fn) {
    this.timers.push({ t: seconds, fn });
  }

  openShop(id) {
    const shop = SHOPS[id];
    this.ui.open({ type: 'shop', ...shop });
  }

  npc(id) {
    return this.npcs.find((n) => n.id === id) ?? null;
  }

  prop(id) {
    return this.world.props.find((p) => p.def.id === id) ?? null;
  }

  openGate(id, instant = false) {
    const prop = this.prop(id);
    if (!prop || prop.opened) return;
    prop.opened = true;
    if (prop.box) this.world.grid.removeBox(prop.box);
    if (instant) { prop.obj.position.y += 3.2; return; }
    audio.play('gate_open', { pos: prop.obj.position, volume: 1 });
    prop.anim = { from: prop.obj.position.y, to: prop.obj.position.y + 3.2, t: 0, dur: 2.5 };
  }

  activateEnemies(group) {
    this.enemies.activate(group, enemyContext(this));
  }

  async spawnEnemy(def) {
    const e = await this.enemies.spawn({ ...def, index: -1 }, this.world.grid);
    if (def.alerted) e.alert(enemyContext(this));
    return e;
  }

  talkTo(npc) {
    npc.talking = 3;
    const r = this.script?.talk?.(this, npc);
    if (!r) this.say([{ who: npc.name, text: '...' }]);
  }

  // ---- Loop ---------------------------------------------------------------------

  start() {
    const loop = (now) => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      try {
        this.update(dt);
      } catch (err) {
        console.error('[game] frame error', err);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt) {
    this.time += dt;
    sharedUniforms.uTime.value = this.time;
    const post = this.ps1.postUniforms;
    post.uTime.value = this.time;
    const mouse = this.input.consumeMouse();
    const paused = !!this.ui.screen && this.ui.screen.type !== 'dead' && this.ui.screen.type !== 'ending';

    if (this.state === 'title' && this.world) this.updateTitleCamera(dt);
    else if (this.state === 'play' && this.world && !paused) this.updatePlay(dt, mouse);

    this.animateWorld(dt);
    this.lights.update(dt, this.camera.position);
    this.effects.update(dt, this.camera);
    this.viewCamera.position.copy(this.camera.position);
    this.viewCamera.quaternion.copy(this.camera.quaternion);
    this.viewCamera.updateMatrixWorld(true);
    audio.setListener(this.camera.position, this.player.forward());

    post.uDamage.value = Math.max(post.uDamage.value - dt * 1.5, this.player.hurtTimer * 1.5, this.player.dead ? 0.6 : 0);
    post.uToxic.value += ((this.inToxic && this.state === 'play' ? 1 : 0) - post.uToxic.value) * Math.min(1, dt * 2);

    this.ui.update(dt);
    this.hud.update(dt);
    this.hud.clear();
    if (this.state === 'play' && (!this.ui.screen || this.ui.screen.type === 'dialog')) this.hud.draw(this);
    this.ui.draw();
    this.input.endFrame();
    const showView = this.state === 'play' && !this.player.dead;
    this.ps1.render(this.scene, this.camera, showView ? this.viewScene : null, this.viewCamera);
  }

  updatePlay(dt, mouse) {
    const { input, player } = this;
    if (input.wasPressed('Escape') || input.wasPressed('KeyP')) { this.pause(); return; }
    const inv = this.settings.invertY ? -1 : 1;
    player.look(mouse.x, mouse.y * inv);
    if (!input.locked) {
      const k = 1400 * dt;
      if (input.isDown('ArrowLeft')) player.look(-k, 0);
      if (input.isDown('ArrowRight')) player.look(k, 0);
      if (input.isDown('ArrowUp')) player.look(0, -k * 0.6);
      if (input.isDown('ArrowDown')) player.look(0, k * 0.6);
    }
    player.update(dt, input, this.world.grid);
    this.stats.time = (this.stats.time ?? 0) + dt;
    this.quickMeleeCd = Math.max(0, this.quickMeleeCd - dt);
    handleWeapons(this, dt, mouse);
    handleSurvival(this, dt);
    const ctx = enemyContext(this);
    this.enemies.update(dt, ctx);
    for (const n of this.npcs) n.update(dt, player);
    for (const p of this.pickups) p.update(dt);
    handlePickups(this);
    handleTriggers(this);
    handleInteraction(this);
    for (const t of this.timers) { t.t -= dt; if (t.t <= 0 && !t.done) { t.done = true; t.fn(); } }
    this.timers = this.timers.filter((t) => !t.done);
    this.script?.update?.(this, dt);
    this.updateFlashlight(dt);
    this.updateMusic(dt);
    this.updateAmbientEvents(dt);
    if (player.dead) {
      this.deathTimer -= dt;
      if (this.deathTimer <= 0 && !this.ui.screen) {
        this.input.exitLock();
        this.ui.open({ type: 'dead', quote: DEATH_QUOTES[Math.floor(Math.random() * DEATH_QUOTES.length)] });
      }
    }
  }

  // Combat music while alerted enemies are close, level music otherwise.
  updateMusic(dt) {
    if (this.flags.kg_done || this.player.dead) return;
    const p = this.player.pos;
    const hot = this.enemies.list.some((e) => e.active && e.alerted && e.pos.distanceTo(p) < 22);
    this.combatTimer = hot ? 6 : Math.max(0, this.combatTimer - dt);
    const want = this.combatTimer > 0 ? 'music_combat' : (this.world.def.music ?? null);
    if (audio.musicTrack?.name !== want) audio.playMusic(want, want === 'music_combat' ? 0.6 : 3);
  }

  // Distant sounds from the dark: the tunnels are never quite silent.
  updateAmbientEvents(dt) {
    const events = this.world.def.events ?? DEFAULT_EVENTS;
    if (!events.length) return;
    this.ambientT = (this.ambientT ?? 12) - dt;
    if (this.ambientT > 0) return;
    this.ambientT = 18 + Math.random() * 25;
    const ev = events[Math.floor(Math.random() * events.length)];
    const a = Math.random() * Math.PI * 2;
    const r = 16 + Math.random() * 12;
    const p = this.player.pos;
    audio.play(ev.name, { pos: new THREE.Vector3(p.x + Math.cos(a) * r, p.y + 1, p.z + Math.sin(a) * r), volume: ev.volume, rate: ev.rate, refDistance: 6 });
  }

  animateWorld(dt) {
    if (!this.world) return;
    if (!this.world.flames) {
      this.world.flames = [];
      this.world.root.traverse((o) => { if (o.userData.flame) this.world.flames.push(o); });
      this.fireMat = materialFor('fx_fire', { lit: false, additive: true, side: THREE.DoubleSide });
      this.fireMat.uniforms.uUvScale.value.set(0.5, 1);
    }
    if (this.world.flames.length) this.fireMat.uniforms.uUvOffset.value.set(Math.floor(this.time * 8) % 2 ? 0.5 : 0, 0);
    for (const f of this.world.flames) f.quaternion.copy(this.camera.quaternion);
    for (const p of this.world.props) {
      if (!p.anim) continue;
      p.anim.t = Math.min(p.anim.dur, p.anim.t + dt);
      const k = p.anim.t / p.anim.dur;
      p.obj.position.y = p.anim.from + (p.anim.to - p.anim.from) * (k * k * (3 - 2 * k));
      if (k >= 1) p.anim = null;
    }
  }

  updateTitleCamera(dt) {
    this.titleCam += dt * 0.04;
    const t = this.titleCam;
    const z = 50 + Math.sin(t) * 22;
    this.camera.position.set(20 + Math.sin(t * 1.7) * 1.5, 3.2, z);
    this.camera.rotation.set(0.12, Math.PI + Math.sin(t * 0.8) * 0.9, 0, 'YXZ');
    this.player.pos.set(this.camera.position.x, 1, this.camera.position.z);
    sharedUniforms.uSpotColor.value.setRGB(0, 0, 0);
  }

  updateFlashlight(dt) {
    const p = this.player;
    this.flashlightOff = Math.max(0, (this.flashlightOff ?? 0) - dt);
    const on = p.flashlight && p.battery > 0 && !p.dead && !(this.flashlightOff > 0 && Math.random() < 0.85);
    sharedUniforms.uSpotPos.value.copy(this.camera.position);
    sharedUniforms.uSpotDir.value.copy(p.forward());
    const k = on ? Math.min(1, 0.2 + p.battery * 1.2) : 0;
    const flicker = p.battery < 0.15 && Math.random() < 0.15 ? 0.3 : 1;
    sharedUniforms.uSpotColor.value.setRGB(1.3 * k * flicker, 1.2 * k * flicker, 0.95 * k * flicker);
  }
}
