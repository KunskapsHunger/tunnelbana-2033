// Story script for the tunnel and Västra skogen.

const S = (who, text) => ({ who, text });

export default {
  onStart(g) {
    g.hud.showTitle('TUNNELN', 'Mot Västra skogen');
    this.refreshObjective(g);
  },

  refreshObjective(g) {
    const f = g.flags;
    if (f.vs_log) g.hud.setObjective('Följ vänstra spåret söderut mot Fridhemsplan.');
    else if (f.vs_station) g.hud.setObjective('Leta efter överlevande. Stationsmästarens kontor ligger vid södra änden.');
    else g.hud.setObjective('Ta dig till Västra skogen.');
  },

  use(g, u) {
    if (u.id === 'guard_note') {
      u.done = true;
      return g.say([
        S('Arvid', 'En vakt från Västra skogen. Han har en lapp i handen.'),
        S('Lappen', '"De kom genom väggarna. Inte från tunneln. Genom VÄGGARNA. Ta kpisten, den behöver inte jag längre."'),
      ]);
    }
    if (u.id === 'radio_log') {
      u.done = true;
      g.flags.vs_log = true;
      return g.say([
        S('Radiodagbok', 'Dag 1. Skrik från södra tunneln. Vi stängde grinden.'),
        S('Radiodagbok', 'Dag 2. En man med gasmask kom förbi. Kallade sig Jägaren. Han sa att de Bleka lockas av ljus.'),
        S('Radiodagbok', 'Dag 2, natt. Jägaren gick söderut mot Fridhemsplan. Han lovade att leda bort dem.'),
        S('Radiodagbok', 'Dag 3. De är inne. Gud hjälpe oss. Det finns ett troll i tunn'),
        S('Arvid', 'Jägaren lever, eller levde för en dag sedan. Söderut. Fridhemsplan.'),
      ], () => {
        this.refreshObjective(g);
        g.checkpoint();
      });
    }
    return null;
  },

  // The ghost train: a light and a roar rush through the tunnel and vanish.
  startGhost(g) {
    g.audio.play('ghost_whispers', { volume: 0.7 });
    g.later(1.6, () => {
      g.audio.play('ghost_train', { volume: 1 });
      this.ghost = { t: 0, light: g.lights.add({ pos: g.player.pos.clone().setZ(g.player.pos.z + 40), color: 0xfff2c0, range: 14, intensity: 3 }) };
      g.flashlightOff = 3.2;
    });
    g.later(5.5, () => g.hud.message('Ett tåg? Inga tåg har gått här på tjugo år...', '#c0b090', 5));
  },

  update(g, dt) {
    const gh = this.ghost;
    if (!gh) return;
    gh.t += dt;
    const k = gh.t / 3;
    gh.light.pos.set(20, 2.2, g.player.pos.z + 40 - k * 60);
    g.player.landImpact = Math.max(g.player.landImpact, 0.04 * Math.sin(gh.t * 40) * Math.max(0, 1 - Math.abs(k - 0.66) * 3));
    if (gh.t > 3) {
      g.lights.remove(gh.light);
      this.ghost = null;
    }
  },

  trigger(g, id) {
    const f = g.flags;
    switch (id) {
      case 'ghost':
        if (f.vs_ghost) break;
        f.vs_ghost = true;
        this.startGhost(g);
        break;
      case 'rats1':
        g.activateEnemies('rats1');
        break;
      case 'crossover':
        if (f.vs_cross) break;
        f.vs_cross = true;
        g.hud.message('Något rör sig i mörkret...', '#c0b090');
        g.audio.play('pale_screech', { volume: 0.8, rate: 0.8 });
        g.later(2, () => g.activateEnemies('cross'));
        break;
      case 'station':
        if (f.vs_station) break;
        f.vs_station = true;
        g.hud.showTitle('VÄSTRA SKOGEN', 'Tyst. För tyst.');
        this.refreshObjective(g);
        g.checkpoint();
        break;
      case 'ambush':
        g.activateEnemies('ambush');
        break;
      case 'troll':
        if (f.vs_troll) break;
        f.vs_troll = true;
        g.activateEnemies('troll');
        g.hud.message('Marken skakar. Något stort kommer!', '#e0a040');
        break;
      case 'exit':
        if (!f.vs_log) { g.hud.message('Du borde undersöka stationsmästarens kontor först.'); break; }
        if (g.enemies.alive('troll').length) { g.hud.message('Trollet blockerar vägen!'); break; }
        g.nextLevel();
        break;
      default:
    }
  },

  onKill(g, enemy) {
    if (enemy.kind === 'troll') {
      g.hud.message('Trollet är dött. Vägen söderut är fri.', '#80c070');
    }
  },
};
