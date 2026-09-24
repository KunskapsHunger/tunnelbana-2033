// Story script for Fridhemsplan.

const S = (who, text) => ({ who, text });

export default {
  onStart(g) {
    g.hud.showTitle('FRIDHEMSPLAN', 'Plundrarnas fäste');
    this.refreshObjective(g);
    if (g.flags.fr_gate) g.openGate('fr_gate', true);
  },

  refreshObjective(g) {
    const f = g.flags;
    if (f.fr_gate) g.hud.setObjective('Grinden är öppen. Fortsätt söderut mot T-Centralen.');
    else if (f.fr_camp) g.hud.setObjective('Öppna södra grinden. Spaken finns i plundrarnas kontrollrum (västra sidan).');
    else g.hud.setObjective('Ta dig förbi plundrarna på Fridhemsplan.');
  },

  talk(g, npc) {
    if (npc.id !== 'smuggler') return null;
    const f = g.flags;
    if (!f.fr_majken) {
      f.fr_majken = true;
      return g.say([
        S('Smugglar-Majken', 'Sch! Inte så högt. Plundrarna tror att jag är död, och så ska det förbli.'),
        S('Smugglar-Majken', 'En man med gasmask? Ja. Han gick förbi för två dagar sen. Plundrarna tog hans patroner men inte hans liv.'),
        S('Smugglar-Majken', 'Han sa något om T-Centralen och en gammal siren. Galningar allihop.'),
        S('Smugglar-Majken', 'Grinden söderut öppnas från kontrollrummet på andra sidan spåret. Bossen sitter där. Vill du handla först?'),
      ], () => g.openShop('fridhem'));
    }
    return g.say([S('Smugglar-Majken', 'Pengar pratar, pojk.')], () => g.openShop('fridhem'));
  },

  use(g, u) {
    if (u.id !== 'gate_lever') return null;
    const boss = g.enemies.list.find((e) => e.kind === 'raider' && e.spawnDef.hpMul && !e.dead);
    if (boss) {
      g.hud.message('Bossen står i vägen!', '#e0a040');
      boss.alert();
      return true;
    }
    u.done = true;
    g.flags.fr_gate = true;
    g.audio.play('lever', { volume: 0.9 });
    g.openGate('fr_gate');
    g.hud.message('Du hör en grind öppnas längre söderut.', '#80c070');
    this.refreshObjective(g);
    g.checkpoint();
    return true;
  },

  trigger(g, id) {
    const f = g.flags;
    if (id === 'camp' && !f.fr_camp) {
      f.fr_camp = true;
      this.refreshObjective(g);
      g.hud.message('Plundrare överallt. Smugglar-Majken ska gömma sig i övergången österut.', '#c0b090', 6);
    }
    if (id === 'exit') {
      if (!f.fr_gate) { g.hud.message('Grinden är låst.'); return; }
      g.nextLevel();
    }
  },

  onKill(g, enemy) {
    if (enemy.kind === 'raider' && enemy.spawnDef.hpMul) {
      g.hud.message('Bossen är död. Spaken är din.', '#80c070');
    }
  },
};
