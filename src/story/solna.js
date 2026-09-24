// Story script for Solna centrum.

const S = (who, text) => ({ who, text });

export default {
  onStart(g) {
    g.hud.showTitle('SOLNA CENTRUM', 'Blå linjen  -  år 2033');
    if (!g.flags.solna_intro) {
      g.flags.solna_intro = true;
      g.hud.setObjective('Hitta Holger på kontoret bakom marknaden (östra grottan).');
      g.later(1.2, () => g.say([
        S('Lilla Ebba', 'Arvid! Arvid, vakna! Holger letar efter dig.'),
        S('Lilla Ebba', 'Han är på kontoret bakom marknaden. Gå över plankorna, på andra sidan spåren.'),
        S('Lilla Ebba', 'Och ta ficklampan, dumbom. Det är mörkt på spåren.'),
      ], () => {
        g.hud.message('WASD: gå   MUS: titta   SHIFT: spring   MELLANSLAG: hoppa', undefined, 8);
        g.hud.message('E: prata   F: ficklampa   TAB: uppdrag', undefined, 8);
      }));
    } else {
      this.refreshObjective(g);
    }
  },

  refreshObjective(g) {
    const f = g.flags;
    if (f.rats_done) g.hud.setObjective('Följ tunneln söderut mot Västra skogen.');
    else if (f.met_jagaren) g.hud.setObjective('Döda råttorna i tunneln!');
    else if (f.met_holger) g.hud.setObjective('Handla hos Kiosk-Kjell, gå sedan till Jägaren vid södra porten.');
    else g.hud.setObjective('Hitta Holger på kontoret bakom marknaden (östra grottan).');
    if (f.rats_done || f.met_jagaren) g.openGate('south_gate', true);
    if (f.met_jagaren) g.npc('jagaren')?.setHidden(true);
  },

  talk(g, npc) {
    const f = g.flags;
    switch (npc.id) {
      case 'barn':
        return g.say([S('Lilla Ebba', f.met_holger
          ? 'Mamma säger att Jägaren har varit på ytan. Det finns inga fåglar där uppe längre.'
          : 'Holger är på kontoret! Bakom Pressbyrån, på andra sidan spåret.')]);
      case 'gubbe':
        return g.say([
          S('Gamle Sture', 'Vet du varför väggarna är målade, pojk? Konstnärerna ville att det skulle kännas som en skog här nere.'),
          S('Gamle Sture', 'Röd himmel, gröna träd. Nu är det den enda skog vi har kvar.'),
          S('Gamle Sture', 'De byggde stationerna i berget för att klara ett krig. Det klarade de. Det var vi som inte gjorde det.'),
        ]);
      case 'vakt':
        return g.say([S('Vakt Sara', f.met_jagaren
          ? 'Porten är öppen. Lycka till där ute, Arvid.'
          : 'Jägaren väntar vid södra porten. Han har aldrig väntat på någon förut.')]);
      case 'kjell':
        return g.say([S('Kiosk-Kjell', 'Välkommen till Pressbyrån. Kanelbullarna tog slut 2013, men patroner har jag.')], () => g.openShop('solna'));
      case 'holger':
        if (!f.met_holger) {
          f.met_holger = true;
          return g.say([
            S('Holger', 'Där är du. Sätt dig inte, det finns ingen tid.'),
            S('Holger', 'Västra skogen har inte svarat på radion på tre dygn. Innan dess hörde vi skrik i tunneln.'),
            S('Holger', 'Jägaren vill prata med dig. Bara med dig. Han väntar vid södra porten.'),
            S('Holger', 'Ta de här tjugo patronerna och köp det du behöver hos Kjell. Och Arvid... var försiktig.'),
          ], () => {
            g.money += 20;
            g.hud.message('+20 militärpatroner (MP)', '#d8b860');
            this.refreshObjective(g);
            g.checkpoint();
          });
        }
        return g.say([S('Holger', f.rats_done ? 'Gå nu. Solna räknar med dig.' : 'Jägaren väntar. Gå!')]);
      case 'jagaren':
        if (!f.met_holger) return g.say([S('Jägaren', 'Prata med Holger först, grabben.')]);
        if (!f.met_jagaren) {
          f.met_jagaren = true;
          return g.say([
            S('Jägaren', 'Arvid. Bra. Lyssna noga, för jag säger det bara en gång.'),
            S('Jägaren', 'Något kommer upp ur djupet under Kungsträdgården. Bleka varelser. De tänker. De jagar i flock.'),
            S('Jägaren', 'Västra skogen är redan borta. Solna blir nästa.'),
            S('Jägaren', 'Jag går ner i tunneln i natt. Om jag inte är tillbaka i gryningen tar du min bricka till T-Centralen.'),
            S('Jägaren', 'Leta upp Överste Lind i Handelsförbundet. Han vet vad som ska göras.'),
            S('Jägaren', '...Hör du det? Råttor. En hel flock. Öppna porten! Vi tar dem i tunneln innan de når barnen!'),
          ], () => {
            g.hud.message('Du fick Jägarens hundbricka.', '#d8b860');
            g.openGate('south_gate');
            g.npc('jagaren')?.setHidden(true);
            g.activateEnemies('rats');
            g.hud.setObjective('Döda råttorna i tunneln!');
            g.hud.message('VÄNSTERKLICK: skjut   R: ladda om   Q: kniv', undefined, 6);
          });
        }
        return null;
      default:
        return null;
    }
  },

  update(g) {
    const f = g.flags;
    if (f.met_jagaren && !f.rats_done && g.enemies.alive('rats').length === 0) {
      f.rats_done = true;
      g.later(1.5, () => g.say([
        S('Arvid', 'Jägaren? ...Jägaren!'),
        S('Arvid', 'Han är borta. Bara mörker och spår söderut.'),
        S('Arvid', 'Om han inte kommer tillbaka... då är det jag som måste gå.'),
      ], () => {
        this.refreshObjective(g);
        g.checkpoint();
      }));
    }
  },

  trigger(g, id) {
    if (id === 'north_seal') g.hud.message('Norra tunneln rasade för länge sedan. Ingen väg där.');
    if (id === 'exit') {
      if (g.flags.rats_done) g.nextLevel();
      else g.hud.message('Du kan inte gå än.');
    }
  },
};
