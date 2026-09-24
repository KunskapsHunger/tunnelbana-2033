import { drawText, wrapText, textWidth, GLYPH_W } from '../engine/bitmapFont.js';
import { audio } from '../engine/audio.js';
import { COL } from './hud.js';

// Full-screen UI states drawn on the HUD canvas: title menu, pause,
// settings, dialogue, shop, death, ending and loading screens.

export class UI {
  constructor(game) {
    this.game = game;
    this.screen = null; // { type, ... }
    this.sel = 0;
    this.typeT = 0;
    this.blipT = 0;
  }

  get g() { return this.game.hud.g; }
  get w() { return this.game.hud.w; }
  get h() { return this.game.hud.h; }

  open(screen) {
    this.screen = screen;
    this.sel = 0;
    this.typeT = 0;
  }

  close() {
    this.screen = null;
  }

  // ---- Input -------------------------------------------------------------

  mouseItem(items, top, lineH) {
    const inp = this.game.input;
    if (inp.locked) return -1;
    const my = (inp.mouseY / window.innerHeight) * this.h;
    const i = Math.floor((my - top + 2) / lineH);
    return i >= 0 && i < items.length ? i : -1;
  }

  navigate(count, top = 0, lineH = 12, items = null) {
    const inp = this.game.input;
    if (inp.anyPressed('ArrowDown', 'KeyS')) { this.sel = (this.sel + 1) % count; audio.play('ui_move', { volume: 0.5 }); }
    if (inp.anyPressed('ArrowUp', 'KeyW')) { this.sel = (this.sel - 1 + count) % count; audio.play('ui_move', { volume: 0.5 }); }
    if (items) {
      const hover = this.mouseItem(items, top, lineH);
      const moved = inp.mouseX !== this.lastMX || inp.mouseY !== this.lastMY;
      this.lastMX = inp.mouseX;
      this.lastMY = inp.mouseY;
      if (hover >= 0 && (moved || inp.mousePressed[0])) this.sel = hover;
      if (hover >= 0 && inp.mousePressed[0]) return true;
    }
    return inp.anyPressed('Enter', 'Space', 'KeyE');
  }

  update(dt) {
    const s = this.screen;
    if (!s) return;
    const handler = this[`update_${s.type}`];
    if (handler) handler.call(this, dt, s);
  }

  draw() {
    const s = this.screen;
    if (!s) return;
    const handler = this[`draw_${s.type}`];
    if (handler) handler.call(this, s);
  }

  // ---- Generic menu ------------------------------------------------------

  menu(s, title, items, { top = this.h * 0.45, back = null } = {}) {
    const inp = this.game.input;
    if (this.navigate(items.length, top, 13, items)) {
      audio.play('ui_select', { volume: 0.6 });
      items[this.sel].action();
      return;
    }
    if (back && inp.wasPressed('Escape')) back();
    void s; void title;
  }

  drawMenu(title, items, { top = this.h * 0.45, subtitle = null, darken = 0.6 } = {}) {
    const g = this.g;
    g.fillStyle = `rgba(0,0,0,${darken})`;
    g.fillRect(0, 0, this.w, this.h);
    if (title) drawText(g, title, this.w / 2, top - 40, '#e8dcb8', { align: 'center', scale: 2 });
    if (subtitle) drawText(g, subtitle, this.w / 2, top - 18, COL.dim, { align: 'center' });
    items.forEach((it, i) => {
      const y = top + i * 13;
      const on = i === this.sel;
      const label = typeof it.label === 'function' ? it.label() : it.label;
      if (on) {
        const w = textWidth(label) + 16;
        g.fillStyle = 'rgba(120,30,20,0.6)';
        g.fillRect(Math.round(this.w / 2 - w / 2), y - 2, w, 11);
      }
      drawText(g, label, this.w / 2, y, on ? '#fff0c8' : COL.text, { align: 'center' });
    });
  }

  // ---- Title -------------------------------------------------------------

  titleItems() {
    const game = this.game;
    const items = [];
    if (game.save.exists()) items.push({ label: 'FORTSÄTT', action: () => game.continueGame() });
    items.push({ label: 'NYTT SPEL', action: () => game.newGame() });
    items.push({ label: 'INSTÄLLNINGAR', action: () => this.open({ type: 'settings', back: 'title' }) });
    items.push({ label: 'KONTROLLER', action: () => this.open({ type: 'controls', back: 'title' }) });
    return items;
  }

  update_title(dt, s) { this.menu(s, '', this.titleItems(), { top: this.h * 0.58 }); }

  draw_title() {
    const g = this.g;
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, 0, this.w, this.h);
    const t = this.game.time;
    const flick = Math.sin(t * 23) > 0.95 ? '#a03020' : '#c83a26';
    const big = Math.max(1, Math.min(4, Math.floor((this.w - 16) / textWidth('TUNNELBANA'))));
    drawText(g, 'TUNNELBANA', this.w / 2, this.h * 0.2, flick, { align: 'center', scale: big });
    drawText(g, '2033', this.w / 2, this.h * 0.2 + big * 9 + 4, '#e8dcb8', { align: 'center', scale: Math.max(1, big - 1) });
    drawText(g, 'BLÅ LINJEN', this.w / 2, this.h * 0.2 + big * 9 + 4 + (big - 1) * 9 + 8, COL.dim, { align: 'center' });
    this.drawMenu(null, this.titleItems(), { top: this.h * 0.58, darken: 0 });
    drawText(g, 'EN PS1-DEMAKE  -  STOCKHOLMS TUNNELBANA', this.w / 2, this.h - 12, '#5a5244', { align: 'center' });
  }

  // ---- Pause -------------------------------------------------------------

  pauseItems() {
    const game = this.game;
    return [
      { label: 'FORTSÄTT', action: () => game.resume() },
      { label: 'LADDA OM KONTROLLPUNKT', action: () => game.continueGame() },
      { label: 'INSTÄLLNINGAR', action: () => this.open({ type: 'settings', back: 'pause' }) },
      { label: 'KONTROLLER', action: () => this.open({ type: 'controls', back: 'pause' }) },
      { label: 'AVSLUTA TILL MENYN', action: () => game.toTitle() },
    ];
  }

  update_pause(dt, s) {
    this.menu(s, 'PAUS', this.pauseItems(), { back: () => this.game.resume() });
  }

  draw_pause() {
    const game = this.game;
    this.drawMenu('PAUS', this.pauseItems(), { subtitle: game.world?.def.title });
    if (game.hud.objective) {
      drawText(this.g, `UPPDRAG: ${game.hud.objective}`, this.w / 2, this.h - 24, COL.warn, { align: 'center' });
    }
  }

  // ---- Settings ----------------------------------------------------------

  settingsItems(s) {
    const game = this.game;
    const st = game.settings;
    const pct = (v) => `${Math.round(v * 100)}%`;
    const step = (key, d, min, max) => {
      st[key] = Math.round(Math.min(max, Math.max(min, st[key] + d)) * 100) / 100;
      game.applySettings();
    };
    return [
      { label: () => `MUSKÄNSLIGHET  < ${st.sensitivity.toFixed(1)} >`, adjust: (d) => step('sensitivity', d * 0.1, 0.2, 3), action: () => step('sensitivity', 0.1, 0.2, 3) },
      { label: () => `SVÅRIGHETSGRAD  < ${DIFF_NAMES[st.difficulty] ?? 'NORMAL'} >`, adjust: (d) => { st.difficulty = (st.difficulty + d + 3) % 3; game.applySettings(); }, action: () => { st.difficulty = (st.difficulty + 1) % 3; game.applySettings(); } },
      { label: () => `LJUSSTYRKA  < ${pct(st.brightness)} >`, adjust: (d) => step('brightness', d * 0.1, 0, 1), action: () => step('brightness', 0.1, 0, 1) },
      { label: () => `VOLYM  < ${pct(st.volume)} >`, adjust: (d) => step('volume', d * 0.1, 0, 1), action: () => step('volume', 0.1, 0, 1) },
      { label: () => `MUSIK  < ${pct(st.music)} >`, adjust: (d) => step('music', d * 0.1, 0, 1), action: () => step('music', 0.1, 0, 1) },
      { label: () => `UPPLÖSNING  < ${st.resolution}p >`, adjust: () => { st.resolution = st.resolution === 240 ? 360 : st.resolution === 360 ? 480 : 240; game.applySettings(); }, action: () => { st.resolution = st.resolution === 240 ? 360 : st.resolution === 360 ? 480 : 240; game.applySettings(); } },
      { label: () => `VERTEX-DARR  < ${st.jitter ? 'PÅ' : 'AV'} >`, adjust: () => { st.jitter = !st.jitter; game.applySettings(); }, action: () => { st.jitter = !st.jitter; game.applySettings(); } },
      { label: () => `AFFIN TEXTUR  < ${st.affine ? 'PÅ' : 'AV'} >`, adjust: () => { st.affine = !st.affine; game.applySettings(); }, action: () => { st.affine = !st.affine; game.applySettings(); } },
      { label: () => `DITHER  < ${st.dither ? 'PÅ' : 'AV'} >`, adjust: () => { st.dither = !st.dither; game.applySettings(); }, action: () => { st.dither = !st.dither; game.applySettings(); } },
      { label: () => `INVERTERA Y  < ${st.invertY ? 'PÅ' : 'AV'} >`, adjust: () => { st.invertY = !st.invertY; game.applySettings(); }, action: () => { st.invertY = !st.invertY; game.applySettings(); } },
      { label: 'TILLBAKA', action: () => this.back(s) },
    ];
  }

  back(s) {
    this.game.saveSettings();
    if (s.back === 'title') this.open({ type: 'title' });
    else this.open({ type: 'pause' });
  }

  update_settings(dt, s) {
    const items = this.settingsItems(s);
    const inp = this.game.input;
    const it = items[this.sel];
    if (it.adjust && inp.anyPressed('ArrowLeft', 'KeyA')) { it.adjust(-1); audio.play('ui_move', { volume: 0.5 }); }
    if (it.adjust && inp.anyPressed('ArrowRight', 'KeyD')) { it.adjust(1); audio.play('ui_move', { volume: 0.5 }); }
    this.menu(s, 'INSTÄLLNINGAR', items, { top: this.h * 0.3, back: () => this.back(s) });
  }

  draw_settings(s) {
    this.drawMenu('INSTÄLLNINGAR', this.settingsItems(s), { top: this.h * 0.3, darken: 0.8 });
  }

  // ---- Controls ------------------------------------------------------------

  update_controls(dt, s) {
    const inp = this.game.input;
    if (inp.anyPressed('Escape', 'Enter', 'Space', 'KeyE') || inp.mousePressed[0]) {
      this.open({ type: s.back === 'title' ? 'title' : 'pause' });
    }
  }

  draw_controls() {
    const g = this.g;
    g.fillStyle = 'rgba(0,0,0,0.85)';
    g.fillRect(0, 0, this.w, this.h);
    drawText(g, 'KONTROLLER', this.w / 2, 20, '#e8dcb8', { align: 'center', scale: 2 });
    const rows = [
      ['W A S D', 'Gå'], ['MUS', 'Titta'], ['VÄNSTERKLICK', 'Skjut'], ['R', 'Ladda om'],
      ['1-4 / HJUL', 'Byt vapen'], ['Q', 'Snabbhugg med kniv'], ['SHIFT', 'Spring'], ['MELLANSLAG', 'Hoppa'],
      ['C / CTRL', 'Huka'], ['E', 'Använd / prata'], ['F', 'Ficklampa'], ['V (håll)', 'Veva dynamo'],
      ['G', 'Gasmask på/av'], ['H', 'Använd förbandslåda'], ['TAB', 'Visa uppdrag'], ['ESC', 'Paus'],
    ];
    rows.forEach(([k, v], i) => {
      const y = 50 + i * 11;
      drawText(g, k, this.w / 2 - 8, y, COL.warn, { align: 'right' });
      drawText(g, v, this.w / 2 + 8, y, COL.text);
    });
    drawText(g, 'Tryck ENTER', this.w / 2, this.h - 14, COL.dim, { align: 'center' });
  }

  // ---- Dialogue ----------------------------------------------------------

  update_dialog(dt, s) {
    const line = s.lines[s.index];
    const inp = this.game.input;
    const prev = Math.floor(this.typeT);
    this.typeT += dt * 45;
    const cur = Math.floor(this.typeT);
    if (cur > prev && cur <= line.text.length && line.text[cur - 1] !== ' ') {
      this.blipT -= 1;
      if (this.blipT <= 0) {
        this.blipT = 2;
        audio.play('talk_blip', { volume: 0.25, rate: line.pitch ?? voicePitch(line.who) });
      }
    }
    const advance = inp.anyPressed('Enter', 'Space', 'KeyE') || inp.mousePressed[0];
    if (!advance) return;
    if (this.typeT < line.text.length) { this.typeT = line.text.length; return; }
    s.index += 1;
    this.typeT = 0;
    if (s.index >= s.lines.length) {
      this.close();
      s.onDone?.();
    }
  }

  draw_dialog(s) {
    const g = this.g;
    const line = s.lines[s.index];
    const boxH = 58;
    const y0 = this.h - boxH - 6;
    const x0 = 10;
    const w = this.w - 20;
    g.fillStyle = 'rgba(8,6,4,0.88)';
    g.fillRect(x0, y0, w, boxH);
    g.fillStyle = '#5a4a36';
    g.fillRect(x0, y0, w, 1);
    g.fillRect(x0, y0 + boxH - 1, w, 1);
    if (line.who) drawText(g, line.who.toUpperCase(), x0 + 8, y0 + 5, line.color ?? COL.warn);
    const shown = line.text.slice(0, Math.floor(this.typeT));
    const lines = wrapText(shown, w - 16);
    lines.slice(0, 4).forEach((l, i) => drawText(g, l, x0 + 8, y0 + 17 + i * 10, COL.text));
    if (this.typeT >= line.text.length && Math.sin(this.game.time * 6) > 0) {
      drawText(g, '>', x0 + w - 12, y0 + boxH - 11, COL.warn);
    }
  }

  // ---- Shop ----------------------------------------------------------------

  update_shop(dt, s) {
    const inp = this.game.input;
    const items = [...s.items, { label: 'LÄMNA', leave: true }];
    const top = 64;
    if (this.navigate(items.length, top, 12, items)) {
      const it = items[this.sel];
      if (it.leave) { this.close(); s.onDone?.(); return; }
      if (this.game.money < it.price) {
        audio.play('dry_fire', { volume: 0.5 });
        this.game.hud.message('Du har inte råd.', COL.bad, 2);
      } else if (it.canBuy && !it.canBuy(this.game)) {
        audio.play('dry_fire', { volume: 0.5 });
        this.game.hud.message(it.denied ?? 'Du kan inte bära mer.', COL.bad, 2);
      } else {
        this.game.money -= it.price;
        it.give(this.game);
        audio.play('buy', { volume: 0.8 });
      }
    }
    if (inp.wasPressed('Escape')) { this.close(); s.onDone?.(); }
  }

  draw_shop(s) {
    const g = this.g;
    g.fillStyle = 'rgba(0,0,0,0.78)';
    g.fillRect(0, 0, this.w, this.h);
    drawText(g, s.title, this.w / 2, 18, '#e8dcb8', { align: 'center', scale: 2 });
    drawText(g, s.subtitle ?? '', this.w / 2, 40, COL.dim, { align: 'center' });
    const items = [...s.items, { label: 'LÄMNA', leave: true }];
    const left = Math.round(this.w / 2 - 130);
    items.forEach((it, i) => {
      const y = 64 + i * 12;
      const on = i === this.sel;
      if (on) { g.fillStyle = 'rgba(120,30,20,0.6)'; g.fillRect(left - 6, y - 2, 272, 11); }
      drawText(g, it.label, left, y, on ? '#fff0c8' : COL.text);
      if (!it.leave) drawText(g, `${it.price} MP`, left + 260, y, this.game.money >= it.price ? '#d8b860' : COL.bad, { align: 'right' });
    });
    drawText(g, `DINA MILITÄRPATRONER: ${this.game.money} MP`, this.w / 2, this.h - 36, '#d8b860', { align: 'center' });
    const it = items[this.sel];
    if (it?.desc) drawText(g, it.desc, this.w / 2, this.h - 22, COL.dim, { align: 'center' });
  }

  // ---- Death / ending / loading --------------------------------------------

  update_dead(dt, s) {
    s.t = (s.t ?? 0) + dt;
    const inp = this.game.input;
    if (s.t > 1.5 && (inp.anyPressed('Enter', 'Space', 'KeyE') || inp.mousePressed[0])) this.game.continueGame();
  }

  draw_dead(s) {
    const g = this.g;
    g.fillStyle = `rgba(40,0,0,${Math.min(0.7, (s.t ?? 0) * 0.5)})`;
    g.fillRect(0, 0, this.w, this.h);
    drawText(g, 'DU DOG', this.w / 2, this.h * 0.4, '#c83a26', { align: 'center', scale: 3 });
    drawText(g, s.quote ?? '', this.w / 2, this.h * 0.4 + 34, COL.dim, { align: 'center' });
    if ((s.t ?? 0) > 1.5) drawText(g, 'Tryck ENTER för att försöka igen', this.w / 2, this.h * 0.7, COL.text, { align: 'center' });
  }

  update_ending(dt, s) {
    s.t = (s.t ?? 0) + dt;
    const inp = this.game.input;
    if (s.t > s.lines.length * 4 + 4 && (inp.anyPressed('Enter', 'Space', 'Escape') || inp.mousePressed[0])) this.game.toTitle();
  }

  draw_ending(s) {
    const g = this.g;
    const t = s.t ?? 0;
    g.fillStyle = `rgba(0,0,0,${Math.min(1, t * 0.4)})`;
    g.fillRect(0, 0, this.w, this.h);
    const blocks = s.lines.map((line) => wrapText(line, this.w - 60));
    const total = blocks.reduce((n, b) => n + b.length * 10 + 10, 0);
    let y = Math.max(12, Math.round((this.h - 20 - total) / 2));
    blocks.forEach((wrapped, i) => {
      const a = Math.max(0, Math.min(1, (t - 1.5 - i * 4) * 0.8));
      g.globalAlpha = a;
      if (a > 0) wrapped.forEach((l, j) => drawText(g, l, this.w / 2, y + j * 10, i === 0 ? '#e8dcb8' : COL.text, { align: 'center' }));
      g.globalAlpha = 1;
      y += wrapped.length * 10 + 10;
    });
    if (t > s.lines.length * 4 + 4) drawText(g, 'SLUT  -  Tryck ENTER', this.w / 2, this.h - 16, COL.dim, { align: 'center' });
  }

  draw_loading(s) {
    const g = this.g;
    g.fillStyle = '#000';
    g.fillRect(0, 0, this.w, this.h);
    drawText(g, s.title ?? 'LADDAR', this.w / 2, this.h * 0.42, '#e8dcb8', { align: 'center', scale: 2 });
    const dots = '.'.repeat(1 + (Math.floor(this.game.time * 3) % 3));
    drawText(g, `LADDAR${dots}`, this.w / 2, this.h * 0.42 + 26, COL.dim, { align: 'center' });
    if (s.tip) {
      wrapText(s.tip, this.w - 80).forEach((l, i) => drawText(g, l, this.w / 2, this.h * 0.75 + i * 10, COL.dim, { align: 'center' }));
    }
  }
}

const DIFF_NAMES = ['LÄTT', 'NORMAL', 'SVÅR'];

function voicePitch(who = '') {
  let h = 0;
  for (const ch of who) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 0.75 + (h % 60) / 100;
}

export { GLYPH_W };
