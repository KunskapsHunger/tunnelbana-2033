import { THEMES, carveStation, PLATFORM_Y } from './themes.js';

// Level 3 — Fridhemsplan, held by raiders (Plundrare).

const F = THEMES.fridhem;
const TUN = THEMES.tunnel;
const P = PLATFORM_Y;

export default {
  id: 'fridhem',
  title: 'FRIDHEMSPLAN',
  subtitle: 'Plundrarnas fäste',
  size: [40, 170],
  ambience: 'amb_station',
  music: 'music_tension',
  ambient: [0.06, 0.05, 0.045],
  fog: { near: 4, far: 32 },
  spawn: { x: 22, z: 3, yaw: Math.PI },
  next: 'tc',

  build(g) {
    g.carve(20, 0, 23, 39, TUN.track);
    g.carve(18, 24, 25, 34, { ...TUN.track, ceil: 4.4 });
    carveStation(g, F, { x: 8, z0: 40, z1: 100, platformW: 8, trackW: 4 });
    g.tracks.push({ axis: 'z', center: 22, from: 0, to: 109, y: 0 });
    g.tracks.push({ axis: 'z', center: 10, from: 40, to: 170, y: 0, powerSide: -1 });
    // Transfer passage to the green line (east), the smuggler hides here.
    g.carve(24, 58, 35, 64, { ...F.platform, ceil: 3.2, vault: 0.2, noise: 0.15, ft: 'terrazzo', wt: 'tile_wall', floorScale: 2, wallU: 2, wallV: 2 });
    g.carve(31, 65, 35, 72, { ...F.platform, ceil: 3.0, vault: 0, noise: 0, ft: 'concrete_floor', wt: 'tile_wall', wallU: 2, wallV: 2 });
    // Raider control room (west).
    g.carve(1, 82, 7, 93, { ...F.platform, ceil: 3.0, vault: 0.2, noise: 0.1, ft: 'wood_planks', wt: 'metal_rust', wallU: 2, wallV: 2 });
    // South tunnel with the gate; right track collapsed.
    g.carve(8, 101, 11, 169, TUN.track);
    g.carve(20, 101, 23, 108, TUN.track);
  },

  entities: [
    { type: 'light', x: 21.5, y: 2.5, z: 29, color: 0xff9040, range: 9, intensity: 1.2, flicker: 0.6 },
    { type: 'light', x: 16, y: 4, z: 50, color: 0xffb070, range: 11, intensity: 1.0, flicker: 0.4 },
    { type: 'light', x: 14, y: 4, z: 68, color: 0xffb070, range: 11, intensity: 1.0, flicker: 0.4 },
    { type: 'light', x: 16, y: 4, z: 86, color: 0xffb070, range: 11, intensity: 0.9, flicker: 0.4 },
    { type: 'light', x: 30, y: 2.4, z: 61, color: 0xa0c0ff, range: 7, intensity: 0.7, strobe: 4 },
    { type: 'light', x: 33, y: 2.2, z: 69, color: 0xffd090, range: 6, intensity: 0.9, flicker: 0.2 },
    { type: 'light', x: 4, y: 2.4, z: 87, color: 0xff6040, range: 8, intensity: 1.0, flicker: 0.2 },
    { type: 'light', x: 10, y: 2.4, z: 108, color: 0xff3020, range: 7, intensity: 0.8, strobe: 2 },

    // Checkpoint barricade in the tunnel.
    { type: 'prop', model: 'sandbags', x: 20.5, z: 32 },
    { type: 'prop', model: 'sandbags', x: 23.5, z: 32 },
    { type: 'prop', model: 'barrel_fire', x: 19, z: 30 },
    { type: 'prop', model: 'crate', x: 24.5, z: 26 },
    { type: 'decal', tex: 'graffiti_1', x: 18.05, y: 1.5, z: 28, rot: Math.PI / 2, w: 3, h: 1.5 },

    // Camp on the platform.
    { type: 'decal', tex: 'sign_fridhem', x: 12.01, y: 3.1, z: 60, rot: -Math.PI / 2, w: 6, h: 0.75 },
    { type: 'decal', tex: 'sign_fridhem', x: 19.99, y: 3.1, z: 80, rot: Math.PI / 2, w: 6, h: 0.75 },
    { type: 'prop', model: 'shack', x: 14.5, z: 54, rot: Math.PI / 2 },
    { type: 'prop', model: 'shack', x: 17.5, z: 76, rot: -Math.PI / 2 },
    { type: 'prop', model: 'barrel_fire', x: 16, z: 48 },
    { type: 'prop', model: 'barrel_fire', x: 15, z: 66 },
    { type: 'prop', model: 'barrel_fire', x: 16.5, z: 90 },
    { type: 'prop', model: 'table', x: 17, z: 60 },
    { type: 'prop', model: 'crate', x: 13, z: 71 },
    { type: 'prop', model: 'crate', x: 13, z: 72.1 },
    { type: 'prop', model: 'crate', x: 18.5, z: 84 },
    { type: 'prop', model: 'barrel', x: 13, z: 84 },
    { type: 'prop', model: 'sandbags', x: 16, z: 95 },
    { type: 'decal', tex: 'mattress', x: 14, y: P + 0.05, z: 62, rx: -Math.PI / 2, w: 0.9, h: 1.9 },
    { type: 'prop', model: 'bunk', x: 18.8, z: 66, rot: 0 },
    { type: 'box', tex: 'wood_planks', x0: 20, x1: 24, z0: 60, z1: 62, y0: P - 0.25, y1: P },
    { type: 'box', tex: 'wood_planks', x0: 8, x1: 12, z0: 86, z1: 88, y0: P - 0.25, y1: P },
    { type: 'box', tex: 'metal_rust', x0: 8.2, x1: 11.8, z0: 45, z1: 45.4, y0: 0, y1: 1.6 },

    // Passage + smuggler
    { type: 'prop', model: 'crate', x: 34, z: 71 },
    { type: 'prop', model: 'barrel_fire', x: 32, z: 70, lightRange: 6 },
    { type: 'decal', tex: 'poster_ad', x: 28, y: P + 1.3, z: 58.02, w: 0.7, h: 1.4 },
    { type: 'decal', tex: 'poster_krig', x: 31, y: P + 1.3, z: 58.02, w: 0.7, h: 1.4 },

    // Control room
    { type: 'prop', model: 'table', x: 3, z: 85 },
    { type: 'prop', model: 'radio', x: 3, z: 85, y: P + 0.8, collide: false },
    { type: 'prop', model: 'generator', x: 2, z: 91 },
    { type: 'prop', model: 'fuse_box', x: 1.15, z: 88, rot: Math.PI / 2, id: 'lever_box', collide: false },
    { type: 'use', id: 'gate_lever', x: 1.5, z: 88, y: P, label: 'Dra i spaken (södra grinden)' },

    // South gate
    { type: 'prop', model: 'gate', x: 10, z: 104, id: 'fr_gate', unique: true },

    // NPC
    { type: 'npc', id: 'smuggler', x: 33.5, z: 68, rot: Math.PI, name: 'Smugglar-Majken', shop: 'fridhem', tint: [1.1, 0.8, 0.9] },

    // Pickups
    { type: 'pickup', kind: 'ammo_rev', x: 24.5, z: 28 },
    { type: 'pickup', kind: 'ammo_9mm', x: 17, z: 60 },
    { type: 'pickup', kind: 'medkit', x: 13, z: 49 },
    { type: 'pickup', kind: 'weapon_shotgun', x: 3, z: 91.8 },
    { type: 'pickup', kind: 'ammo_shells', x: 6, z: 83 },
    { type: 'pickup', kind: 'mp', amount: 25, x: 4.5, z: 85 },
    { type: 'pickup', kind: 'filter', x: 34, z: 59.5 },
    { type: 'pickup', kind: 'ammo_9mm', x: 10, z: 120 },

    // Raiders
    { type: 'enemy', kind: 'raider', x: 21, z: 34.5, rot: Math.PI },
    { type: 'enemy', kind: 'raider', x: 23, z: 35, rot: Math.PI },
    { type: 'enemy', kind: 'raider', x: 15, z: 52, rot: 0 },
    { type: 'enemy', kind: 'raider', x: 17, z: 64, rot: Math.PI },
    { type: 'enemy', kind: 'raider', x: 13.5, z: 74, rot: 0 },
    { type: 'enemy', kind: 'raider', x: 18, z: 82, rot: Math.PI },
    { type: 'enemy', kind: 'raider', x: 15, z: 94, rot: Math.PI },
    { type: 'enemy', kind: 'raider', x: 4, z: 89, rot: Math.PI / 2, hpMul: 2.2, scale: 1.1 },
    { type: 'enemy', kind: 'rat', x: 9, z: 130 },
    { type: 'enemy', kind: 'rat', x: 10, z: 134 },
    { type: 'enemy', kind: 'pale', x: 10, z: 145 },

    { type: 'trigger', id: 'camp', rect: [8, 40, 23, 42] },
    { type: 'trigger', id: 'exit', rect: [8, 158, 11, 169] },
  ],
};
