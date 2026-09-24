import { drawText, wrapText, textWidth } from '../engine/bitmapFont.js';
import { getTexture, loadTexture } from '../engine/assets.js';
import { WEAPONS, AMMO_NAMES } from './weapons.js';

// In-game HUD drawn onto the low-res overlay canvas.

const COL = {
  text: '#d8ceb0',
  dim: '#8a8270',
  warn: '#e0a040',
  bad: '#d04030',
  good: '#80c070',
  panel: 'rgba(10,8,6,0.72)',
  edge: '#3a342a',
};

export class HUD {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.messages = [];
    this.objective = '';
    this.objectiveFlash = 0;
    this.prompt = '';
    this.title = null;
    this.hitMarker = 0;
    this.pickupFlash = 0;
    this.maskImg = null;
    this.crackImg = null;
    loadTexture('hud_mask').then(() => { this.maskImg = getTexture('hud_mask')?.image ?? null; });
    loadTexture('hud_mask_crack').then(() => { this.crackImg = getTexture('hud_mask_crack')?.image ?? null; });
  }

  get w() { return this.canvas.width; }
  get h() { return this.canvas.height; }

  message(text, color = COL.text, time = 4) {
    this.messages.push({ text, color, time });
    if (this.messages.length > 4) this.messages.shift();
  }

  setObjective(text) {
    if (text === this.objective) return;
    this.objective = text;
    this.objectiveFlash = 4;
  }

  showTitle(title, subtitle) {
    this.title = { title, subtitle, time: 5 };
  }

  clear() {
    this.g.clearRect(0, 0, this.w, this.h);
  }

  update(dt) {
    for (const m of this.messages) m.time -= dt;
    this.messages = this.messages.filter((m) => m.time > 0);
    this.objectiveFlash = Math.max(0, this.objectiveFlash - dt);
    this.hitMarker = Math.max(0, this.hitMarker - dt);
    this.pickupFlash = Math.max(0, this.pickupFlash - dt);
    if (this.title) {
      this.title.time -= dt;
      if (this.title.time <= 0) this.title = null;
    }
  }

  draw(game) {
    const g = this.g;
    g.imageSmoothingEnabled = false;
    const p = game.player;
    if (p.maskOn) this.drawMask(p);
    this.drawCrosshair(game);
    this.drawStats(game);
    this.drawWeapon(game);
    this.drawMessages();
    if (this.prompt) {
      const w = textWidth(this.prompt) + 8;
      g.fillStyle = COL.panel;
      g.fillRect(Math.round(this.w / 2 - w / 2), Math.round(this.h * 0.62) - 2, w, 12);
      drawText(g, this.prompt, this.w / 2, this.h * 0.62, COL.text, { align: 'center' });
    }
    if (this.objective && (this.objectiveFlash > 0 || game.input.isDown('Tab'))) {
      const a = Math.min(1, this.objectiveFlash);
      drawText(g, 'UPPDRAG:', this.w / 2, 8, COL.warn, { align: 'center' });
      const lines = wrapText(this.objective, this.w - 24);
      this.objectiveLines = lines.length;
      lines.forEach((l, i) => drawText(g, l, this.w / 2, 18 + i * 10, a > 0.3 ? COL.text : COL.dim, { align: 'center' }));
    } else {
      this.objectiveLines = 0;
    }
    if (game.boss && !game.boss.dead && !game.boss.dormant) this.drawBoss(game.boss);
    if (!game.input.locked && !game.ui.screen && !p.dead && Math.sin(game.time * 4) > -0.3) {
      drawText(g, 'KLICKA FÖR ATT STYRA MED MUSEN', this.w / 2, this.h * 0.38, COL.warn, { align: 'center' });
    }
    if (this.title) this.drawTitle();
  }

  drawBoss(boss) {
    const w = Math.max(60, Math.min(170, this.w - 250));
    const x = Math.round(this.w / 2 - w / 2);
    const y = this.h - 12;
    drawText(this.g, 'MODERN', this.w / 2, y - 10, boss.stunned > 0 ? '#80a0ff' : COL.bad, { align: 'center' });
    this.bar(x, y, w, 4, boss.hp / boss.maxHp, boss.stunned > 0 ? '#6080e0' : '#a02820');
  }

  drawTitle() {
    const g = this.g;
    const t = this.title.time;
    const a = Math.min(1, t, (5 - t) * 2);
    g.globalAlpha = Math.max(0, a);
    drawText(g, this.title.title, this.w / 2, this.h * 0.3, '#e8dcb8', { align: 'center', scale: 2 });
    drawText(g, this.title.subtitle, this.w / 2, this.h * 0.3 + 22, COL.dim, { align: 'center' });
    g.globalAlpha = 1;
  }

  drawCrosshair(game) {
    const g = this.g;
    const cx = Math.floor(this.w / 2), cy = Math.floor(this.h / 2);
    g.fillStyle = this.hitMarker > 0 ? '#ff5040' : 'rgba(220,210,180,0.75)';
    const s = game.arsenal?.weapon?.melee ? 1 : 3;
    g.fillRect(cx, cy, 1, 1);
    g.fillRect(cx - s - 1, cy, 2, 1);
    g.fillRect(cx + s, cy, 2, 1);
    g.fillRect(cx, cy - s - 1, 1, 2);
    g.fillRect(cx, cy + s, 1, 2);
  }

  bar(x, y, w, h, frac, color, back = '#201a14') {
    const g = this.g;
    g.fillStyle = '#000';
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle = back;
    g.fillRect(x, y, w, h);
    g.fillStyle = color;
    g.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), h);
  }

  drawStats(game) {
    const g = this.g;
    const p = game.player;
    const x = 8, y = this.h - 34;
    g.fillStyle = COL.panel;
    g.fillRect(x - 4, y - 4, 112, 32);
    const hp = p.health / p.maxHealth;
    drawText(g, '+', x, y, hp < 0.3 ? COL.bad : COL.text);
    this.bar(x + 9, y + 1, 60, 5, hp, hp < 0.3 ? COL.bad : '#b04030');
    drawText(g, String(Math.ceil(p.health)), x + 74, y, COL.text);
    // Flashlight battery
    drawText(g, 'L', x, y + 10, p.flashlight ? COL.warn : COL.dim);
    this.bar(x + 9, y + 11, 60, 3, p.battery, p.battery < 0.2 ? COL.bad : '#c0a040');
    if (p.cranking) drawText(g, 'VEVAR', x + 74, y + 9, COL.warn);
    // Filters / mask
    const ft = Math.ceil(p.filterTime);
    const filterTxt = `F ${p.filters}  ${Math.floor(ft / 60)}:${String(ft % 60).padStart(2, '0')}`;
    drawText(g, filterTxt, x, y + 19, p.maskOn ? (p.filterTime < 20 ? COL.bad : COL.good) : COL.dim);
    drawText(g, `${game.money} MP`, x + 74, y + 19, '#d8b860');
  }

  drawWeapon(game) {
    const a = game.arsenal;
    if (!a) return;
    const g = this.g;
    const w = WEAPONS[a.current];
    const x = this.w - 8, y = this.h - 26;
    g.fillStyle = COL.panel;
    g.fillRect(this.w - 108, y - 4, 104, 24);
    drawText(g, w.name, x, y, COL.text, { align: 'right' });
    if (w.mag) {
      const mag = a.magazine[a.current];
      const res = a.reserve[w.ammo] ?? 0;
      drawText(g, `${mag}/${res}`, x, y + 10, mag === 0 ? COL.bad : COL.text, { align: 'right' });
      drawText(g, AMMO_NAMES[w.ammo], this.w - 104, y + 10, COL.dim);
    }
    if (a.reloading > 0) drawText(g, 'LADDAR OM', this.w / 2, this.h / 2 + 12, COL.warn, { align: 'center' });
    else if (w.mag && a.magazine[a.current] === 0) drawText(g, (a.reserve[w.ammo] ?? 0) > 0 ? '[R] LADDA OM' : 'SLUT PÅ AMMUNITION', this.w / 2, this.h / 2 + 12, COL.bad, { align: 'center' });
  }

  drawMessages() {
    let y = this.objectiveLines ? 22 + this.objectiveLines * 10 : 8;
    for (const m of this.messages) {
      const lines = wrapText(m.text, Math.min(260, this.w - 16));
      this.g.globalAlpha = Math.min(1, m.time);
      for (const line of lines) {
        drawText(this.g, line, 8, y, m.color);
        y += 10;
      }
      this.g.globalAlpha = 1;
    }
  }

  drawMask(p) {
    const g = this.g;
    if (this.maskImg) {
      g.drawImage(this.maskImg, 0, 0, this.w, this.h);
    } else {
      g.strokeStyle = '#000';
      g.lineWidth = 30;
      g.beginPath();
      g.ellipse(this.w / 2, this.h / 2, this.w * 0.55, this.h * 0.58, 0, 0, Math.PI * 2);
      g.stroke();
    }
    if (p.maskHealth < 70) {
      g.globalAlpha = p.maskHealth < 35 ? 1 : 0.6;
      if (this.crackImg) g.drawImage(this.crackImg, 0, 0, this.w, this.h);
      g.globalAlpha = 1;
    }
    // Condensation fog when the filter is nearly spent.
    if (p.filterTime < 20) {
      g.fillStyle = `rgba(200,210,200,${(1 - p.filterTime / 20) * 0.35})`;
      g.fillRect(0, 0, this.w, this.h);
    }
  }
}

export { COL };
