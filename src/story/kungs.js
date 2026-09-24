// Story script for Kungsträdgården: fuses, Hesa Fredrik and Modern.

const S = (who, text) => ({ who, text });
const TONE = 7;
const CYCLE = 21;

const ENDING = [
  'Hesa Fredrik tystnade först i gryningen.',
  'Modern rörde sig aldrig mer. De Bleka drog sig tillbaka ner i djupet, och tunnlarna blev tysta.',
  'I Solna tände man eldar för Arvid, och för Jägaren, som aldrig kom tillbaka.',
  'Men den natten hörde radiooperatören på T-Centralen något nytt i bruset.',
  '"...detta är ett viktigt meddelande till allmänheten. Vi hörde er signal. Ni är inte ensamma."',
  'TUNNELBANA 2033',
];

export default {
  onStart(g) {
    g.hud.showTitle('KUNGSTRÄDGÅRDEN', 'Boet');
    this.sirenT = 0;
    this.spawnT = 0;
    this.toneOn = false;
    for (const n of [1, 2, 3]) if (g.flags[`kg_fuse${n}`]) this.fuseLight(g, n);
    this.refreshObjective(g);
  },

  fuses(g) {
    return [1, 2, 3].filter((n) => g.flags[`kg_fuse${n}`]).length;
  },

  refreshObjective(g) {
    const f = g.flags;
    const n = this.fuses(g);
    if (f.kg_siren) g.hud.setObjective('Döda Modern! Skjut under sirenens ton.');
    else if (n === 3) g.hud.setObjective('Dra i huvudspaken i sirenbunkern (södra änden av stationen).');
    else if (f.kg_station) g.hud.setObjective(`Sätt i säkringar i elcentralerna: ${n}/3 (palatsruinen i väst, servicetunneln i öst, plattformens södra ände).`);
    else g.hud.setObjective('Ta dig till Kungsträdgården.');
  },

  fuseLight(g, n) {
    for (const l of g.lights.lights) if (l.tag === `fuse${n}`) l.color.setHex(0x30ff40);
  },

  use(g, u) {
    const f = g.flags;
    const m = /^fuse(\d)$/.exec(u.id);
    if (m) {
      const n = Number(m[1]);
      if (f[`kg_fuse${n}`]) return true;
      u.done = true;
      f[`kg_fuse${n}`] = true;
      g.audio.play('fuse', { volume: 1 });
      this.fuseLight(g, n);
      g.activateEnemies(`w${n}`);
      g.hud.message(`Säkring ${this.fuses(g)}/3 isatt. Ljudet väcker något...`, '#80c070');
      this.refreshObjective(g);
      if (this.fuses(g) === 3) g.later(3, () => g.checkpoint());
      return true;
    }
    if (u.id === 'siren_lever') {
      if (this.fuses(g) < 3) {
        g.hud.message(`Ingen ström. Säkringar: ${this.fuses(g)}/3.`, '#e0a040');
        return true;
      }
      u.done = true;
      f.kg_siren = true;
      g.audio.play('lever', { volume: 1 });
      this.startSiren(g);
      return true;
    }
    return null;
  },

  startSiren(g) {
    for (const l of g.lights.lights) if (l.tag === 'flood') l.enabled = true;
    g.say([
      S('Arvid', 'Strömmen går till. Strålkastarna tänds i boet.'),
      S('Arvid', 'Kom igen, gamla Fredrik. Ryt.'),
    ], () => {
      this.sirenT = 0;
      this.toneOn = false;
      g.activateEnemies('mother');
      const mother = g.enemies.list.find((e) => e.kind === 'mother');
      g.boss = mother ?? null;
      g.hud.showTitle('MODERN', 'Hon har vaknat');
      this.refreshObjective(g);
    });
  },

  update(g, dt) {
    const f = g.flags;
    if (!f.kg_siren || !g.boss) return;
    const mother = g.boss;
    this.sirenT += dt;
    const phase = this.sirenT % CYCLE;
    const tone = phase < TONE;
    if (tone && !this.toneOn) {
      g.audio.play('hesa_fredrik', { volume: 1, pos: { x: 19.5, y: 6, z: 113 }, refDistance: 40, maxDistance: 200 });
      g.hud.message('HESA FREDRIK LJUDER!', '#e0a040', 2);
    }
    this.toneOn = tone;
    for (const e of g.enemies.list) {
      if (!e.active) continue;
      if (e === mother) {
        e.damageMul = tone ? 1 : 0.2;
        if (tone) e.stunned = 0.2;
      } else if (tone && e.kind === 'pale') {
        e.stunned = 0.2;
        e.takeDamage(12 * dt, null);
      }
    }
    if (!tone && !mother.dead) {
      this.spawnT -= dt;
      const pales = g.enemies.alive().filter((e) => e.kind === 'pale').length;
      if (this.spawnT <= 0 && pales < 5) {
        this.spawnT = 7;
        const spots = [[10, 128], [38, 128], [10, 162], [38, 162], [24, 164]];
        const [x, z] = spots[Math.floor(Math.random() * spots.length)];
        g.spawnEnemy({ kind: 'pale', x, z, alerted: true });
        g.audio.play('mother_roar', { pos: mother.pos, volume: 0.9 });
      }
    }
    if (mother.dead && !f.kg_done) {
      f.kg_done = true;
      g.audio.playMusic('music_ending');
      for (const e of g.enemies.list) if (e.active) e.die(null);
      g.later(6, () => g.ending(ENDING));
    }
  },

  trigger(g, id) {
    const f = g.flags;
    if (id === 'station' && !f.kg_station) {
      f.kg_station = true;
      g.hud.showTitle('KUNGSTRÄDGÅRDEN', 'Djupast av alla');
      this.refreshObjective(g);
      g.checkpoint();
    }
    if (id === 'bunker' && !f.kg_bunker) {
      f.kg_bunker = true;
      g.hud.message('Sirenbunkern. Bakom den: boet. Det luktar sött och ruttet.', '#c0b090', 5);
    }
    if (id === 'nest' && !f.kg_siren) {
      g.hud.message('Något enormt andas i mörkret. Du borde inte vara här utan ljus och ljud.', '#e0a040', 4);
    }
  },
};
