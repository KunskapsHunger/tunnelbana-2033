import { THEMES, carveStation, PLATFORM_Y } from './themes.js';

// Level 5 — Kungsträdgården. Restore three fuses, sound Hesa Fredrik from the
// civil-defence bunker and destroy Modern in the nest below.

const K = THEMES.kungs;
const TUN = THEMES.tunnel;
const P = PLATFORM_Y;

export default {
  id: 'kungs',
  title: 'KUNGSTRÄDGÅRDEN',
  subtitle: 'Boet',
  size: [50, 170],
  ambience: 'amb_nest',
  music: 'music_tension',
  ambient: [0.04, 0.035, 0.045],
  fog: { near: 3, far: 28 },
  spawn: { x: 26, z: 3, yaw: Math.PI },
  next: null,

  build(g) {
    g.carve(24, 0, 27, 44, TUN.track);
    g.carve(22, 18, 29, 28, { ...TUN.track, ceil: 4.4, wt: 'rock_kungs' });
    carveStation(g, K, { x: 12, z0: 45, z1: 108, platformW: 8, trackW: 4 });
    g.tracks.push({ axis: 'z', center: 26, from: 0, to: 116, y: 0 });
    g.tracks.push({ axis: 'z', center: 14, from: 45, to: 116, y: 0, powerSide: -1 });
    g.carve(12, 109, 15, 115, TUN.track);
    g.carve(24, 109, 27, 115, TUN.track);
    // Makalös palace fragments (west).
    g.carve(2, 58, 11, 76, K.palace);
    // Service tunnel (east) with fuse #2.
    g.carve(28, 80, 35, 96, { ...TUN.service, floor: P, ceil: P + 2.8 });
    // Siren bunker.
    g.carve(16, 109, 23, 120, { ...K.palace, ceil: P + 3.4, vault: 0.15, ft: 'concrete_floor', wt: 'metal_panel', ct: 'concrete_floor', wallU: 2, wallV: 2, noise: 0 });
    g.carve(18, 121, 21, 122, { ...K.nest, floor: 0.75, ceil: 4, vault: 0.2 });
    // The nest.
    g.carve(6, 123, 42, 166, K.nest);
    g.fillSolid(14, 134, 16, 137);
    g.fillSolid(32, 140, 34, 143);
    g.fillSolid(12, 152, 14, 154);
    g.fillSolid(34, 156, 36, 158);
  },

  entities: [
    { type: 'light', x: 26, y: 2.5, z: 8, color: 0xffd090, range: 7, intensity: 0.6, flicker: 0.4 },
    { type: 'light', x: 25.5, y: 1.2, z: 23, color: 0x60ff80, range: 9, intensity: 0.7, flicker: 0.5 },
    { type: 'light', x: 20, y: 4, z: 55, color: 0x80a0ff, range: 12, intensity: 0.6, strobe: 2.2 },
    { type: 'light', x: 20, y: 4, z: 90, color: 0xff4020, range: 12, intensity: 0.6, strobe: 1.4 },
    { type: 'light', x: 6, y: 2.6, z: 67, color: 0xffa060, range: 9, intensity: 0.8, flicker: 0.5 },
    { type: 'light', x: 31.5, y: 3, z: 88, color: 0xd0e0ff, range: 7, intensity: 0.8, strobe: 6 },
    { type: 'light', x: 19.5, y: 3.6, z: 114, color: 0xff2010, range: 9, intensity: 1.0, strobe: 3 },
    { type: 'light', x: 24, y: 2.5, z: 145, color: 0x5070ff, range: 16, intensity: 0.6, flicker: 0.3 },
    // Floodlights in the nest (switched on by the siren).
    { type: 'light', x: 12, y: 5, z: 130, color: 0xffffff, range: 18, intensity: 1.6, enabled: false, tag: 'flood' },
    { type: 'light', x: 36, y: 5, z: 132, color: 0xffffff, range: 18, intensity: 1.6, enabled: false, tag: 'flood' },
    { type: 'light', x: 24, y: 6, z: 150, color: 0xffffff, range: 20, intensity: 1.8, enabled: false, tag: 'flood' },
    { type: 'light', x: 12, y: 5, z: 160, color: 0xffffff, range: 16, intensity: 1.5, enabled: false, tag: 'flood' },
    { type: 'light', x: 37, y: 5, z: 161, color: 0xffffff, range: 16, intensity: 1.5, enabled: false, tag: 'flood' },
    // Fuse indicator lights.
    { type: 'light', x: 3.5, y: 2.2, z: 72, color: 0xff2000, range: 4, intensity: 1.0, tag: 'fuse1' },
    { type: 'light', x: 34.5, y: 2.2, z: 94, color: 0xff2000, range: 4, intensity: 1.0, tag: 'fuse2' },
    { type: 'light', x: 22.5, y: 2.2, z: 106, color: 0xff2000, range: 4, intensity: 1.0, tag: 'fuse3' },

    { type: 'decal', tex: 'sign_kungs', x: 16.01, y: 3.2, z: 60, rot: -Math.PI / 2, w: 7, h: 0.8 },
    { type: 'decal', tex: 'sign_kungs', x: 23.99, y: 3.2, z: 85, rot: Math.PI / 2, w: 7, h: 0.8 },
    { type: 'decal', tex: 'poster_hesa', x: 16.02, y: P + 1.5, z: 117, rot: Math.PI / 2, w: 0.8, h: 1.6 },
    { type: 'decal', tex: 'graffiti_1', x: 22.05, y: 1.5, z: 24, rot: Math.PI / 2, w: 3, h: 1.5 },
    { type: 'decal', tex: 'graffiti_2', x: 12.05, y: 1.5, z: 100, rot: Math.PI / 2, w: 3, h: 1.5 },

    { type: 'box', tex: 'wood_planks', x0: 11, x1: 16, z0: 66, z1: 68, y0: P - 0.25, y1: P },
    { type: 'box', tex: 'wood_planks', x0: 24, x1: 28, z0: 84, z1: 86, y0: P - 0.25, y1: P },
    { type: 'prop', model: 'train_car', x: 14, z: 90, rz: -0.08 },
    { type: 'prop', model: 'bench', x: 18, z: 70, rot: 0.3, rz: 1.5 },
    { type: 'prop', model: 'barrel', x: 21, z: 78 },
    { type: 'prop', model: 'crate', x: 22.5, z: 96 },
    { type: 'prop', model: 'npc', x: 19, z: 82, rx: -Math.PI / 2, rot: 1, collide: false, unique: true, tint: [0.5, 0.5, 0.55] },
    { type: 'decal', tex: 'blood', x: 19, y: P + 0.03, z: 82, rx: -Math.PI / 2, w: 2, h: 2 },
    { type: 'decal', tex: 'blood', x: 26, y: 0.03, z: 40, rx: -Math.PI / 2, w: 2.2, h: 2.2 },

    // Fuse boxes
    { type: 'prop', model: 'fuse_box', x: 2.15, z: 72, rot: Math.PI / 2, collide: false },
    { type: 'prop', model: 'fuse_box', x: 35.85, z: 94, rot: -Math.PI / 2, collide: false },
    { type: 'prop', model: 'fuse_box', x: 22.85, z: 106, rot: -Math.PI / 2, collide: false },
    { type: 'use', id: 'fuse1', x: 2.6, z: 72, y: P, label: 'Sätt i säkring' },
    { type: 'use', id: 'fuse2', x: 35.4, z: 94, y: P, label: 'Sätt i säkring' },
    { type: 'use', id: 'fuse3', x: 22.4, z: 106, y: P, label: 'Sätt i säkring' },

    // Bunker
    { type: 'prop', model: 'siren', x: 19.5, z: 113 },
    { type: 'prop', model: 'generator', x: 17, z: 118.5 },
    { type: 'prop', model: 'fuse_box', x: 22.85, z: 118, rot: -Math.PI / 2, collide: false },
    { type: 'use', id: 'siren_lever', x: 22.3, z: 118, y: P, label: 'Dra i huvudspaken' },
    { type: 'prop', model: 'crate', x: 17, z: 110 },
    { type: 'prop', model: 'sandbags', x: 19.5, z: 119.8, collide: false },

    // Palace room
    { type: 'prop', model: 'crate', x: 4, z: 60 },
    { type: 'prop', model: 'barrel_fire', x: 6, z: 66 },

    // Pickups
    { type: 'pickup', kind: 'filter', x: 26, z: 14 },
    { type: 'pickup', kind: 'ammo_9mm', x: 23, z: 20 },
    { type: 'pickup', kind: 'medkit', x: 4, z: 74 },
    { type: 'pickup', kind: 'ammo_shells', x: 9, z: 60 },
    { type: 'pickup', kind: 'ammo_rev', x: 33, z: 82 },
    { type: 'pickup', kind: 'medkit', x: 34, z: 92 },
    { type: 'pickup', kind: 'ammo_9mm', x: 18, z: 104 },
    { type: 'pickup', kind: 'ammo_shells', x: 13, z: 113 },
    { type: 'pickup', kind: 'ammo_9mm', x: 26, z: 113 },
    { type: 'pickup', kind: 'medkit', x: 21.5, z: 110 },
    { type: 'pickup', kind: 'ammo_rev', x: 17.5, z: 110 },

    // Enemies
    { type: 'enemy', kind: 'pale', x: 26, z: 30 },
    { type: 'enemy', kind: 'pale', x: 25, z: 38 },
    { type: 'enemy', kind: 'rat', x: 24, z: 22 },
    { type: 'enemy', kind: 'rat', x: 27, z: 25 },
    { type: 'enemy', kind: 'pale', x: 20, z: 62 },
    { type: 'enemy', kind: 'pale', x: 14, z: 75 },
    { type: 'enemy', kind: 'pale', x: 7, z: 70 },
    { type: 'enemy', kind: 'troll', x: 31.5, z: 90, rot: Math.PI },
    { type: 'enemy', kind: 'pale', x: 20, z: 100 },
    { type: 'enemy', kind: 'pale', x: 13, z: 62, dormant: 'w1' },
    { type: 'enemy', kind: 'pale', x: 14, z: 72, dormant: 'w1' },
    { type: 'enemy', kind: 'pale', x: 26, z: 88, dormant: 'w2' },
    { type: 'enemy', kind: 'pale', x: 25, z: 80, dormant: 'w2' },
    { type: 'enemy', kind: 'rat', x: 26, z: 92, dormant: 'w2' },
    { type: 'enemy', kind: 'pale', x: 14, z: 104, dormant: 'w3' },
    { type: 'enemy', kind: 'pale', x: 26, z: 104, dormant: 'w3' },
    { type: 'enemy', kind: 'troll', x: 14, z: 112, dormant: 'w3' },
    { type: 'enemy', kind: 'mother', x: 24, z: 152, rot: Math.PI, dormant: 'mother' },

    { type: 'trigger', id: 'spores', rect: [22, 17, 29, 28], toxic: true, persistent: true },
    { type: 'trigger', id: 'station', rect: [12, 46, 27, 48] },
    { type: 'trigger', id: 'bunker', rect: [16, 109, 23, 111] },
    { type: 'trigger', id: 'nest', rect: [6, 123, 42, 125] },
  ],
};
