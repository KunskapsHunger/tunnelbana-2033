// Story script for T-Centralen (hub).

const S = (who, text) => ({ who, text });

export default {
  onStart(g) {
    g.hud.showTitle('T-CENTRALEN', 'Handelsförbundet');
    this.refreshObjective(g);
    if (g.flags.tc_lind) g.openGate('kungs_gate', true);
  },

  refreshObjective(g) {
    const f = g.flags;
    if (f.tc_lind) g.hud.setObjective('Gå genom grinden söderut mot Kungsträdgården. Handla först om du behöver.');
    else g.hud.setObjective('Hitta Överste Lind i kommandoposten bakom marknaden.');
  },

  talk(g, npc) {
    const f = g.flags;
    switch (npc.id) {
      case 'tull':
        if (!f.tc_tull) {
          f.tc_tull = true;
          return g.say([
            S('Tulltjänsteman Berit', 'Välkommen till T-Centralen, knutpunkten för hela tunnelbanan. Tull: fem patroner.'),
            S('Arvid', 'Jag har ett meddelande till Överste Lind. Från Jägaren.'),
            S('Tulltjänsteman Berit', '...Jägaren? Då är tullen betald. Lind sitter i kommandoposten bakom marknaden. Över spåret, till höger.'),
          ], () => this.refreshObjective(g));
        }
        return g.say([S('Tulltjänsteman Berit', 'Nästa! ...Ja, det är bara du.')]);
      case 'vakt1':
      case 'vakt2':
        return g.say([S('Förbundsvakt', f.tc_lind && npc.id === 'vakt2' ? 'Överstens order. Grinden är öppen. Må Gud vara med dig.' : 'Handelsförbundet håller ordning här. Sköt dig.')]);
      case 'handlare':
        return g.say([S('Handlare Göran', 'Handelsförbundet har bästa priserna söder om Solna. Titta gärna.')], () => g.openShop('tc'));
      case 'musiker':
        return g.say([
          S('Spelman Nils', 'Vem kan segla förutan vind, vem kan ro utan åror...'),
          S('Spelman Nils', 'Min mormor sjöng den. Den handlar om att skiljas från sin vän. Det gör vi alla här nere, förr eller senare.'),
        ]);
      case 'predikant':
        return g.say([
          S('Predikanten', 'De Bleka är inte monster, mitt barn. De är Guds straff för det vi gjorde med himlen.'),
          S('Predikanten', 'Buga dig för mörkret, så skonar det dig kanske.'),
          S('Arvid', 'Säg det till Västra skogen.'),
        ]);
      case 'unge':
        return g.say([S('Svampunge Alva', 'Vill du köpa svamp? Nej? Då vet jag inget om sirenen i Kungsträdgården. Ingenting alls.')]);
      case 'lind':
        return this.talkLind(g);
      default:
        return null;
    }
  },

  talkLind(g) {
    const f = g.flags;
    if (f.tc_lind) return g.say([S('Överste Lind', 'Tre säkringar, sedan spaken. Låt Hesa Fredrik ryta, Arvid.')]);
    f.tc_lind = true;
    return g.say([
      S('Överste Lind', 'Du bär Villes bricka. Då är han död, eller så har han skickat dig för att han inte hann själv.'),
      S('Arvid', 'Han sa att du vet vad som ska göras.'),
      S('Överste Lind', 'Jag vet. Ingen har vågat göra det. De Bleka kommer ur ett gammalt skyddsrum under Kungsträdgården.'),
      S('Överste Lind', 'Deras hörsel är fruktansvärd. Ljud som vi knappt tål får dem att krampa. Och ljus bränner dem.'),
      S('Överste Lind', 'I skyddsrummet finns Stockholms sista fungerande Hesa Fredrik, och strålkastare. Ström saknas.'),
      S('Överste Lind', 'Sätt i tre säkringar i elcentralerna vid stationen. Dra sedan i huvudspaken i sirenbunkern.'),
      S('Överste Lind', 'Viktigt meddelande till allmänheten: sju sekunders ton, fjorton sekunders tystnad. Om och om igen.'),
      S('Överste Lind', 'Under tonen är de hjälplösa. Då slår du till. Det som bor längst in... det vill du inte veta om.'),
      S('Överste Lind', 'Jag öppnar grinden. Ta med dig det du behöver från Göran. Handelsförbundet bjuder på femtio patroner.'),
    ], () => {
      g.money += 50;
      g.hud.message('+50 militärpatroner (MP)', '#d8b860');
      g.openGate('kungs_gate');
      this.refreshObjective(g);
      g.checkpoint();
    });
  },

  trigger(g, id) {
    if (id === 'arrive' && !g.flags.tc_arrive) {
      g.flags.tc_arrive = true;
      g.hud.message('Ljus. Röster. Musik. T-Centralen lever fortfarande.', '#c0b090', 5);
    }
    if (id === 'exit') {
      if (!g.flags.tc_lind) { g.hud.message('Grinden är stängd.'); return; }
      g.nextLevel();
    }
  },
};
