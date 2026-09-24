import { THEMES, carveStation, PLATFORM_Y } from './themes.js';

// Level 4 — T-Centralen. Safe hub of the Handelsförbundet: market,
// Överste Lind, and the gate towards Kungsträdgården.

const TC = THEMES.tc;
const TUN = THEMES.tunnel;
const P = PLATFORM_Y;

export default {
  id: 'tc',
  title: 'T-CENTRALEN',
  subtitle: 'Handelsförbundet',
  size: [50, 132],
  ambience: 'amb_station',
  music: null,
  events: [],
  // Spelman Nils plays the folk tune on his harmonium.
  sounds: [{ name: 'music_menu', x: 41.8, y: 1.8, z: 65.7, volume: 0.9, refDistance: 3, maxDistance: 35, bus: 'music' }],
  ambient: [0.1, 0.1, 0.12],
  fog: { near: 6, far: 40 },
  spawn: { x: 16, z: 3, yaw: Math.PI },
  next: 'kungs',

  build(g) {
    g.carve(14, 0, 17, 29, TUN.track);
    carveStation(g, TC, { x: 14, z0: 30, z1: 95, platformW: 10, trackW: 4 });
    g.tracks.push({ axis: 'z', center: 16, from: 0, to: 96, y: 0, powerSide: -1 });
    g.tracks.push({ axis: 'z', center: 30, from: 30, to: 132, y: 0 });
    // Market hall east of the right track.
    g.carve(32, 40, 47, 85, TC.hall);
    // Överste Lind's command post.
    g.carve(36, 86, 46, 94, { ...TC.hall, ceil: 3.0, vault: 0.1, noise: 0.05, ft: 'wood_planks', wt: 'wood_planks', wallU: 2, wallV: 2 });
    // Customs checkpoint at the north platform end.
    g.carve(20, 24, 25, 29, { ...TC.platform, ceil: 3.4, vault: 0.2 });
    // Tunnel towards Kungsträdgården.
    g.carve(28, 96, 31, 131, TUN.track);
  },

  entities: [
    { type: 'light', x: 16, y: 2.5, z: 20, color: 0xffd090, range: 8, intensity: 0.9, flicker: 0.1 },
    { type: 'light', x: 22.5, y: 3, z: 27, color: 0xffe0b0, range: 8, intensity: 1.1, flicker: 0.05 },
    { type: 'light', x: 23, y: 5, z: 40, color: 0xfff0d0, range: 14, intensity: 1.1, flicker: 0.05 },
    { type: 'light', x: 23, y: 5, z: 60, color: 0xfff0d0, range: 14, intensity: 1.1, flicker: 0.05 },
    { type: 'light', x: 23, y: 5, z: 80, color: 0xfff0d0, range: 14, intensity: 1.0, flicker: 0.08 },
    { type: 'light', x: 39, y: 3.5, z: 48, color: 0xffc080, range: 11, intensity: 1.2, flicker: 0.2 },
    { type: 'light', x: 42, y: 3.5, z: 64, color: 0xffc080, range: 11, intensity: 1.2, flicker: 0.2 },
    { type: 'light', x: 39, y: 3.5, z: 79, color: 0xffc080, range: 11, intensity: 1.1, flicker: 0.2 },
    { type: 'light', x: 41, y: 2.6, z: 90, color: 0xffe0a0, range: 8, intensity: 1.2, flicker: 0.05 },
    { type: 'light', x: 30, y: 2.4, z: 100, color: 0xff3020, range: 8, intensity: 0.9, strobe: 2 },

    { type: 'decal', tex: 'sign_tc', x: 18.01, y: 3.2, z: 45, rot: -Math.PI / 2, w: 6, h: 0.75 },
    { type: 'decal', tex: 'sign_tc', x: 27.99, y: 3.2, z: 70, rot: Math.PI / 2, w: 6, h: 0.75 },
    { type: 'decal', tex: 'sign_t', x: 22.5, y: 3.3, z: 24.05, w: 1.2, h: 1.2, lit: false },
    { type: 'decal', tex: 'poster_hesa', x: 46.95, y: P + 1.4, z: 60, rot: -Math.PI / 2, w: 0.8, h: 1.6 },
    { type: 'decal', tex: 'poster_krig', x: 36.02, y: P + 1.4, z: 93.95, rot: Math.PI, w: 0.8, h: 1.6 },
    { type: 'decal', tex: 'poster_ad', x: 32.02, y: P + 1.4, z: 70, rot: Math.PI / 2, w: 0.8, h: 1.6 },

    // Customs
    { type: 'prop', model: 'table', x: 21, z: 27 },
    { type: 'prop', model: 'turnstile', x: 21.5, z: 29.6 },
    { type: 'prop', model: 'turnstile', x: 23.5, z: 29.6 },
    // Platform: tents and campfires
    { type: 'prop', model: 'shack', x: 19.5, z: 50, rot: Math.PI / 2 },
    { type: 'prop', model: 'shack', x: 26.5, z: 56, rot: -Math.PI / 2 },
    { type: 'prop', model: 'shack', x: 19.5, z: 72, rot: Math.PI / 2 },
    { type: 'prop', model: 'barrel_fire', x: 23, z: 50 },
    { type: 'prop', model: 'barrel_fire', x: 22, z: 66 },
    { type: 'prop', model: 'barrel_fire', x: 23.5, z: 86 },
    { type: 'prop', model: 'bench', x: 21, z: 60, rot: Math.PI / 2 },
    { type: 'prop', model: 'bench', x: 25, z: 64, rot: -Math.PI / 2 },
    { type: 'prop', model: 'lamp_hanging', x: 23, y: 4.8, z: 58, collide: false },
    { type: 'prop', model: 'lamp_hanging', x: 23, y: 4.8, z: 76, collide: false },
    { type: 'prop', model: 'bunk', x: 26.8, z: 80, rot: 0 },
    { type: 'prop', model: 'bunk', x: 26.8, z: 83, rot: 0 },
    { type: 'box', tex: 'wood_planks', x0: 28, x1: 32, z0: 49, z1: 51.5, y0: P - 0.25, y1: P },
    { type: 'box', tex: 'wood_planks', x0: 28, x1: 32, z0: 74, z1: 76.5, y0: P - 0.25, y1: P },
    // Market hall
    { type: 'prop', model: 'shack', x: 45, z: 46, rot: -Math.PI / 2 },
    { type: 'prop', model: 'shack', x: 45, z: 54, rot: -Math.PI / 2 },
    { type: 'prop', model: 'shack', x: 45, z: 70, rot: -Math.PI / 2 },
    { type: 'prop', model: 'table', x: 38, z: 52 },
    { type: 'prop', model: 'table', x: 38, z: 58 },
    { type: 'prop', model: 'table', x: 40, z: 72 },
    { type: 'prop', model: 'crate', x: 34, z: 42 },
    { type: 'prop', model: 'crate', x: 35.1, z: 42 },
    { type: 'prop', model: 'crate', x: 34.5, z: 42, y: P + 0.8 },
    { type: 'prop', model: 'barrel', x: 46, z: 62 },
    { type: 'prop', model: 'barrel', x: 46, z: 63.2 },
    { type: 'prop', model: 'barrel_fire', x: 40, z: 64 },
    { type: 'prop', model: 'radio', x: 40, z: 72, y: P + 0.8, collide: false },
    // Command post
    { type: 'prop', model: 'table', x: 41, z: 90 },
    { type: 'prop', model: 'radio', x: 41.5, z: 90, y: P + 0.8, collide: false },
    { type: 'prop', model: 'generator', x: 37.5, z: 93 },
    { type: 'prop', model: 'crate', x: 45, z: 87.5 },
    // Gate to Kungsträdgården
    { type: 'prop', model: 'gate', x: 30, z: 100, id: 'kungs_gate', unique: true },
    { type: 'prop', model: 'sandbags', x: 30, z: 97 },

    // NPCs
    { type: 'npc', id: 'tull', x: 22.5, z: 26.5, rot: Math.PI, name: 'Tulltjänsteman Berit', tint: [0.8, 0.85, 1.1] },
    { type: 'npc', id: 'vakt1', model: 'raider', x: 24.5, z: 31, rot: Math.PI, name: 'Förbundsvakt', pose: 'guard', tint: [0.7, 0.8, 1.1] },
    { type: 'npc', id: 'handlare', x: 43.5, z: 54, rot: -Math.PI / 2, name: 'Handlare Göran', shop: 'tc', tint: [1.1, 1.0, 0.85] },
    { type: 'npc', id: 'musiker', x: 41.8, z: 65.7, rot: Math.PI, name: 'Spelman Nils', pose: 'sit', tint: [1.0, 0.85, 0.85] },
    { type: 'npc', id: 'predikant', x: 22, z: 70, rot: Math.PI / 2, name: 'Predikanten', tint: [0.6, 0.6, 0.65] },
    { type: 'npc', id: 'unge', x: 36, z: 58, rot: Math.PI / 2, name: 'Svampunge Alva', scale: 0.66, tint: [1.0, 1.1, 0.9] },
    { type: 'npc', id: 'lind', x: 41, z: 91.5, rot: Math.PI, name: 'Överste Lind', scale: 1.05, tint: [0.75, 0.9, 0.7] },
    { type: 'npc', id: 'vakt2', model: 'raider', x: 31.5, z: 96.5, rot: Math.PI, name: 'Förbundsvakt', pose: 'guard', tint: [0.7, 0.8, 1.1] },

    { type: 'pickup', kind: 'medkit', x: 26.5, z: 81.5 },
    { type: 'pickup', kind: 'ammo_rev', x: 35, z: 44 },

    { type: 'trigger', id: 'arrive', rect: [14, 18, 25, 22] },
    { type: 'trigger', id: 'exit', rect: [28, 118, 31, 131] },
  ],
};
