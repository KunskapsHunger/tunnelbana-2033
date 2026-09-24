import { THEMES, carveStation, PLATFORM_Y } from './themes.js';

// Level 1 — Solna centrum. Home station: red sky, green forest paintings.
// North is sealed, south gate leads into the tunnel towards Västra skogen.

const T = THEMES.solna;
const TUN = THEMES.tunnel;
const P = PLATFORM_Y;

export default {
  id: 'solna',
  title: 'SOLNA CENTRUM',
  subtitle: 'Blå linjen, 2033',
  size: [44, 150],
  ambience: 'amb_station',
  music: null,
  // A crackling radio in the market plays the old folk song.
  sounds: [
    { name: 'music_menu', x: 20, y: 1.8, z: 72, volume: 0.35, refDistance: 2, maxDistance: 22, bus: 'music' },
    { name: 'music_menu', x: 35, y: 1.8, z: 81.5, volume: 0.3, refDistance: 1.5, maxDistance: 14, bus: 'music' },
  ],
  ambient: [0.075, 0.06, 0.055],
  fog: { near: 5, far: 38 },
  spawn: { x: 6.5, z: 47.5, yaw: -Math.PI / 2 },
  next: 'tunnel',

  build(g) {
    // Tracks run the full length; station hall z 30..90.
    carveStation(g, T, { x: 12, z0: 30, z1: 90, platformW: 8, trackW: 4 });
    // North tunnels (collapsed end) and south tunnels.
    g.carve(12, 18, 15, 29, TUN.track);
    g.carve(24, 18, 27, 29, TUN.track);
    g.carve(12, 91, 15, 149, TUN.track);
    g.carve(24, 91, 27, 104, TUN.track);
    g.tracks.push({ axis: 'z', center: 14, from: 18, to: 150, y: 0, powerSide: -1 });
    g.tracks.push({ axis: 'z', center: 26, from: 18, to: 105, y: 0, powerSide: 1 });

    // Escalator hall north of the platform (sealed blast door).
    g.carve(17, 21, 22, 29, { ...T.cave, ceil: 3.6 });
    // West living cave, reached over a plank bridge.
    g.carve(2, 38, 11, 62, T.cave);
    g.carve(4, 34, 9, 37, { ...T.cave, ceil: 2.8 });
    // East market cave.
    g.carve(28, 58, 38, 78, T.cave);
    // Commander's office behind the market.
    g.carve(32, 79, 37, 84, { ...T.cave, ceil: 2.8, ft: 'wood_planks', wt: 'wood_planks', wallU: 2, wallV: 2, noise: 0 });
    // Service passage west of the south tunnel (maintenance niche).
    g.carve(9, 110, 11, 114, THEMES.tunnel.service);
  },

  entities: [
    // --- Lights ---------------------------------------------------------
    { type: 'light', x: 7, y: 3, z: 44, color: 0xffb070, range: 9, intensity: 1.2, flicker: 0.3 },
    { type: 'light', x: 5, y: 3, z: 56, color: 0xffb070, range: 9, intensity: 1.1, flicker: 0.3 },
    { type: 'light', x: 20, y: 5, z: 36, color: 0xffe0b0, range: 12, intensity: 0.9, flicker: 0.08 },
    { type: 'light', x: 20, y: 5, z: 84, color: 0xffe0b0, range: 12, intensity: 0.8, flicker: 0.1 },
    { type: 'light', x: 33, y: 3, z: 66, color: 0xffc080, range: 10, intensity: 1.2, flicker: 0.1 },
    { type: 'light', x: 34.5, y: 2.5, z: 82, color: 0xffd090, range: 6, intensity: 1.0, flicker: 0.05 },
    { type: 'light', x: 19.5, y: 3, z: 24, color: 0xff3020, range: 8, intensity: 0.9, strobe: 2.5 },
    { type: 'light', x: 14, y: 2.2, z: 98, color: 0xffcc66, range: 8, intensity: 1.0, flicker: 0.4 },
    { type: 'light', x: 14, y: 2.0, z: 120, color: 0x60ff90, range: 6, intensity: 0.5, flicker: 0.6 },

    // --- Station dressing ---------------------------------------------
    { type: 'prop', model: 'barrel_fire', x: 19, z: 42 },
    { type: 'prop', model: 'barrel_fire', x: 21, z: 60 },
    { type: 'prop', model: 'barrel_fire', x: 18.5, z: 76 },
    { type: 'prop', model: 'bench', x: 17, z: 45, rot: Math.PI / 2 },
    { type: 'prop', model: 'bench', x: 22.5, z: 52, rot: -Math.PI / 2 },
    { type: 'prop', model: 'bench', x: 17, z: 66, rot: Math.PI / 2 },
    { type: 'prop', model: 'lamp_hanging', x: 20, y: 4.2, z: 50, collide: false },
    { type: 'prop', model: 'lamp_hanging', x: 20, y: 4.2, z: 68, collide: false },
    { type: 'prop', model: 'shack', x: 19, z: 56, rot: Math.PI / 2 },
    { type: 'prop', model: 'crate', x: 22.3, z: 40 },
    { type: 'prop', model: 'crate', x: 22.3, z: 41.1 },
    { type: 'prop', model: 'crate', x: 22.3, z: 40.5, y: P + 0.8 },
    { type: 'prop', model: 'table', x: 20, z: 72 },
    { type: 'prop', model: 'radio', x: 20, z: 72, y: P + 0.8, collide: false },
    { type: 'prop', model: 'sandbags', x: 20, z: 88 },
    { type: 'prop', model: 'turnstile', x: 18, z: 29.3 },
    { type: 'prop', model: 'turnstile', x: 20, z: 29.3 },
    { type: 'prop', model: 'turnstile', x: 22, z: 29.3 },
    { type: 'prop', model: 'train_car', x: 26, z: 94, collide: true, unique: false },

    // West living cave
    { type: 'prop', model: 'bunk', x: 3, z: 44, rot: Math.PI / 2 },
    { type: 'prop', model: 'bunk', x: 3, z: 48, rot: Math.PI / 2 },
    { type: 'prop', model: 'bunk', x: 3, z: 52, rot: Math.PI / 2 },
    { type: 'prop', model: 'shack', x: 9, z: 58, rot: Math.PI },
    { type: 'prop', model: 'shack', x: 4.5, z: 59.5, rot: Math.PI },
    { type: 'prop', model: 'barrel_fire', x: 7, z: 44.5 },
    { type: 'prop', model: 'table', x: 8.5, z: 51 },
    // Plank bridges over the tracks
    { type: 'box', tex: 'wood_planks', x0: 12, x1: 16, z0: 49, z1: 51, y0: P - 0.25, y1: P },
    { type: 'box', tex: 'wood_planks', x0: 24, x1: 28, z0: 65, z1: 67, y0: P - 0.25, y1: P },

    // East market cave
    { type: 'prop', model: 'shack', x: 36, z: 62, rot: -Math.PI / 2, id: 'pressbyran' },
    { type: 'prop', model: 'crate', x: 30, z: 60 },
    { type: 'prop', model: 'barrel', x: 29.5, z: 61.2 },
    { type: 'prop', model: 'barrel_fire', x: 32, z: 70 },
    { type: 'prop', model: 'bench', x: 30, z: 73, rot: Math.PI / 2 },
    { type: 'prop', model: 'table', x: 35, z: 81.5 },
    { type: 'prop', model: 'radio', x: 35, z: 81.5, y: P + 0.8, collide: false },

    // South gate
    { type: 'prop', model: 'gate', x: 14, z: 100, id: 'south_gate', unique: true },
    { type: 'prop', model: 'sandbags', x: 13, z: 97, rot: 0 },
    { type: 'prop', model: 'barrel_fire', x: 15.2, z: 96.5 },

    // Signs & posters
    { type: 'decal', tex: 'sign_solna', x: 16.02, y: 3.1, z: 48, rot: -Math.PI / 2, w: 6, h: 0.75 },
    { type: 'decal', tex: 'sign_solna', x: 23.98, y: 3.1, z: 70, rot: Math.PI / 2, w: 6, h: 0.75 },
    { type: 'decal', tex: 'sign_solna', x: 16.01, y: 3.1, z: 48, rot: Math.PI / 2, w: 6, h: 0.75 },
    { type: 'decal', tex: 'sign_solna', x: 23.99, y: 3.1, z: 70, rot: -Math.PI / 2, w: 6, h: 0.75 },
    { type: 'decal', tex: 'sign_t', x: 19.5, y: 3.2, z: 21.1, w: 1.2, h: 1.2, lit: false },
    { type: 'decal', tex: 'poster_krig', x: 2.05, y: 2.4, z: 55, rot: Math.PI / 2, w: 0.8, h: 1.6 },
    { type: 'decal', tex: 'poster_hesa', x: 37.95, y: 2.4, z: 70, rot: -Math.PI / 2, w: 0.8, h: 1.6 },
    { type: 'decal', tex: 'poster_ad', x: 22.9, y: 2.3, z: 21.05, w: 0.8, h: 1.6 },
    { type: 'decal', tex: 'graffiti_1', x: 12.05, y: 1.4, z: 95, rot: Math.PI / 2, w: 3, h: 1.5 },
    { type: 'decal', tex: 'graffiti_2', x: 27.95, y: 1.6, z: 36, rot: -Math.PI / 2, w: 3, h: 1.5 },

    // --- Characters ----------------------------------------------------
    { type: 'npc', id: 'holger', x: 34.5, z: 81, rot: 0, name: 'Holger', tint: [0.85, 0.9, 0.75] },
    { type: 'npc', id: 'kjell', x: 35.2, z: 63.5, rot: -Math.PI / 2, name: 'Kiosk-Kjell', shop: 'solna', tint: [1.15, 1.0, 0.8] },
    { type: 'npc', id: 'jagaren', model: 'raider', x: 14, z: 96, rot: 0, name: 'Jägaren', tint: [0.75, 0.85, 0.7], pose: 'guard' },
    { type: 'npc', id: 'vakt', model: 'raider', x: 20, z: 87, rot: 0, name: 'Vakt Sara', tint: [0.9, 0.8, 0.75], pose: 'guard' },
    { type: 'npc', id: 'barn', x: 8, z: 50, rot: Math.PI, name: 'Lilla Ebba', scale: 0.62, tint: [1.2, 0.9, 0.9] },
    { type: 'npc', id: 'gubbe', x: 18, z: 43, rot: Math.PI / 2, name: 'Gamle Sture', tint: [0.8, 0.8, 0.85], pose: 'sit' },

    // --- Pickups -------------------------------------------------------
    { type: 'pickup', kind: 'ammo_rev', x: 9.5, z: 51 },
    { type: 'pickup', kind: 'medkit', x: 3, z: 39 },
    { type: 'pickup', kind: 'filter', x: 10, z: 112 },
    { type: 'pickup', kind: 'ammo_rev', x: 10, z: 113 },
    { type: 'pickup', kind: 'mp', amount: 15, x: 5.5, z: 35 },

    // --- Enemies (appear during the rat attack) --------------------------
    { type: 'enemy', kind: 'rat', x: 14, z: 118, dormant: 'rats' },
    { type: 'enemy', kind: 'rat', x: 13, z: 121, dormant: 'rats' },
    { type: 'enemy', kind: 'rat', x: 15, z: 124, dormant: 'rats' },
    { type: 'enemy', kind: 'rat', x: 14, z: 127, dormant: 'rats' },
    { type: 'enemy', kind: 'rat', x: 13, z: 130, dormant: 'rats' },

    // --- Triggers --------------------------------------------------------
    { type: 'trigger', id: 'exit', rect: [12, 140, 15, 149] },
    { type: 'trigger', id: 'north_seal', rect: [12, 18, 27, 22] },
    { type: 'trigger', id: 'toxic', rect: [12, 118, 15, 124], toxic: true, persistent: true },
  ],
};
