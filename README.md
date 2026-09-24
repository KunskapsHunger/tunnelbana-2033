# TUNNELBANA 2033

**Spela i webbläsaren:** https://kunskapshunger.github.io/tunnelbana-2033/

En PS1-inspirerad demake av ett överlevnadsspel i *Metro*-anda, som utspelar sig
i de målade berggrottorna längs Stockholms blå linje. Spelet är på svenska.

Det är år 2033. Du är Arvid från Solna centrum och färdas söderut, via Västra
skogen, Fridhemsplan och T-Centralen, ner till Kungsträdgården. Där väcker du
den gamla tyfonen **Hesa Fredrik** och möter De Blekas moder.

> *A PS1-style survival shooter set in Stockholm's blue-line metro stations.
> Swedish language. Runs in any modern desktop browser.*

## Kontroller

| Tangent | Funktion |
|---------|----------|
| W A S D / mus | gå / titta (klicka i spelet för att fånga musen) |
| Vänsterklick | skjut |
| R | ladda om |
| 1–4, mushjul | kniv, revolver m/1887, kpist m/45, hagelbössa |
| Q | snabbhugg med kniv |
| Shift / Mellanslag / C | spring / hoppa / huka |
| E | prata / använd |
| F | ficklampa (håll **V** för att veva dynamon) |
| G | gasmask (filtren räcker två minuter) |
| H | förbandslåda |
| Tab / Esc | visa uppdrag / paus |

Under *Inställningar* går det att ändra svårighetsgrad, ljusstyrka och upplösning
(240p, 360p eller 480p). Där kan du också slå av PS1-effekterna var för sig:
vertex-darr, affin textur och dither.

Spelet kräver en dator med mus och tangentbord. Det fungerar inte på mobil.

## Kör lokalt

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # enhetstester + kontroll att alla banor går att klara
npm run build    # statisk version i dist/
```

`?level=solna|tunnel|fridhem|tc|kungs` hoppar direkt till en bana.

## Om projektet

- **Motor:** three.js med en egen PS1-renderare. Den har låg upplösning, "darrande" vertexar, affin texturmappning, vertexljus och 15-bitars färg med dither.
- **Grafik:** texturerna är procedurgenererade i Python. 3D-modellerna är byggda i Blender och gjorda av stela delar, som på PS1-tiden.
- **Ljud och musik:** allt är syntetiserat, bland annat Hesa Fredrik och en arrangering av en traditionell svensk folkvisa.

Genereringsverktygen ingår inte i det här repot. Det innehåller bara spelet och de färdiga assets-filerna.

## Kodstruktur

- `src/engine`: renderare, PS1-material, input, ljud, assets, bitmapfont
- `src/levels`: banornas rutnät, mesh-bygge och de fem banorna
- `src/game`: spelare, vapen, fiender, AI, HUD, menyer, sparning
- `src/story`: dialog, manus och handlare
- `docs/DESIGN.md`: spelets design
