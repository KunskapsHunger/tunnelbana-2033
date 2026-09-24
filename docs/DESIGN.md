# TUNNELBANA 2033 — design

A PS1-era demake of a *Metro 2033*-style survival FPS, set in the Stockholm
tunnelbana. Written in three.js, assets made in Blender + Python.

## Premise

Stockholm, 2033. Twenty years after the war the survivors live in the deep
bedrock stations of **Blå linjen** — the painted caves that were built as civil
defence shelters. Something pale is coming up from beneath Kungsträdgården.
Stations fall silent one by one.

The player is **Arvid**, a young sentry from Solna centrum. The hunter
**Ville "Jägaren"** leaves him his dog tag and a message for **Överste Lind** of
the Handelsförbundet at T-Centralen before disappearing into the tunnels.

Arvid travels south along the blue line. At T-Centralen he learns that the
Pale Ones (**De Bleka**) cannot stand the sound of the old civil-defence siren
**Hesa Fredrik** combined with floodlights. The last working siren is at
Kungsträdgården, right inside the nest.

## Levels (Blå linjen, north → south)

| # | Level | Mood | Content |
|---|-------|------|---------|
| 1 | **Solna centrum** | home, warm fires | Red sky + green forest cave paintings. Tutorial, NPCs, trader, Jägaren's farewell. Exit south gate. |
| 2 | **Tunneln / Västra skogen** | dread | Dark tunnel, derailed C20 cars, rats, first Pale Ones. Toxic sections need gas mask. Abandoned station. |
| 3 | **Fridhemsplan** | hostile | Raider (Plundrare) outpost. Human enemies with guns. Get through the barricade. |
| 4 | **T-Centralen** | safe hub | Blue vine paintings. Handelsförbundet market, Överste Lind, shop. Reveals Hesa Fredrik plan. |
| 5 | **Kungsträdgården** | nest | Green/red/white cave. Restore 3 generator fuses, then trigger Hesa Fredrik. Boss: **Modern** (The Mother). Ending. |

## Core systems

- **FPS controls** WASD, mouse look, Shift sprint, Ctrl/C crouch, Space jump, E use,
  R reload, F flashlight, G gas mask, Q quick melee, 1–4 weapons, Tab journal.
- **Weapons**: Kniv (knife), Revolver m/1887, Kpist m/45 "Carl Gustaf",
  Hagelbössa (double-barrel shotgun).
- **Currency**: *Militärpatroner* (MP) — pre-war military rounds.
  Buy ammo/filters/medkits at traders.
- **Gas mask** with filters (timer) in toxic zones; the mask cracks with damage.
- **Flashlight** battery drains; hold **V** to crank the dynamo.
- **Enemies**: Tunnelråtta (fast, weak), Blek (pale humanoid, leaping melee),
  Plundrare (raider, ranged), Bergtroll (brute), Modern (boss).
- **PS1 look**: 320×240 internal render, nearest upscale, vertex snapping,
  affine texture warp, Gouraud vertex lighting, 15-bit colour + ordered dither,
  black fog, low-poly segmented models.
- Checkpoint save per level (localStorage), menu, settings, subtitles (Swedish).

## Code layout

```
src/engine   renderer + PS1 post, PS1 material, input, audio, asset loading
src/game     player, weapons, enemies, AI, pickups, HUD, dialogue, story
src/levels   ASCII level definitions → geometry, collision, entities
tools/       Python + Blender generators for textures, audio, models
public/assets generated assets (textures/, audio/, models/)
```
