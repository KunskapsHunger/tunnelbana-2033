import { THEMES, carveStation, PLATFORM_Y } from './themes.js';

// Level 2 — the tunnel south of Solna and the fallen station Västra skogen.

const V = THEMES.vskogen;
const TUN = THEMES.tunnel;
const P = PLATFORM_Y;

export default {
  id: 'tunnel',
  title: 'VÄSTRA SKOGEN',
  subtitle: 'Tunneln söderut',
  size: [36, 200],
  ambience: 'amb_tunnel',
  music: 'music_tension',
  ambient: [0.035, 0.035, 0.04],
  fog: { near: 3, far: 26 },
  spawn: { x: 20, z: 3, yaw: Math.PI },
  next: 'fridhem',

  build(g) {
    g.carve(18, 0, 21, 61, TUN.track);
    g.carve(15, 14, 24, 32, { ...TUN.track, ceil: 4.6 });
    g.tracks.push({ axis: 'z', center: 20, from: 0, to: 62, y: 0 });
    // Service room with the dead guard.
    g.carve(23, 36, 28, 41, TUN.service);
    g.carve(22, 38, 22, 39, TUN.service);
    // Crossover cavern with rock pillars.
    g.carve(9, 62, 26, 76, { ...TUN.track, ceil: 4.6, vault: 0.4 });
    for (const [x, z] of [[14, 66], [20, 66], [14, 71], [20, 71]]) g.fillSolid(x, z, x + 1, z + 1);
    // Västra skogen station.
    carveStation(g, V, { x: 10, z0: 77, z1: 130, platformW: 8, trackW: 4 });
    g.tracks.push({ axis: 'z', center: 12, from: 62, to: 200, y: 0, powerSide: -1 });
    g.tracks.push({ axis: 'z', center: 24, from: 62, to: 139, y: 0 });
    // Station master's office (east), reached from the right track.
    g.carve(26, 118, 31, 125, { ...TUN.service, floor: P, ceil: P + 2.6 });
    // South tunnels.
    g.carve(10, 131, 13, 199, TUN.track);
    g.carve(22, 131, 25, 138, TUN.track);
  },

  entities: [
    // Lights: sparse, failing.
    { type: 'light', x: 20, y: 3, z: 6, color: 0xffd090, range: 7, intensity: 0.8, flicker: 0.3 },
    { type: 'light', x: 22.5, y: 2.3, z: 24, color: 0xff5030, range: 7, intensity: 0.8, flicker: 0.5 },
    { type: 'light', x: 25.5, y: 2.4, z: 38.5, color: 0xd0e0ff, range: 6, intensity: 0.9, strobe: 5 },
    { type: 'light', x: 20, y: 1.5, z: 50, color: 0x70ff80, range: 8, intensity: 0.7, flicker: 0.4 },
    { type: 'light', x: 17.5, y: 3, z: 69, color: 0xff9050, range: 9, intensity: 0.5, flicker: 0.7 },
    { type: 'light', x: 18, y: 4, z: 90, color: 0xd0e0ff, range: 10, intensity: 0.8, strobe: 3 },
    { type: 'light', x: 18, y: 4, z: 112, color: 0xff3020, range: 10, intensity: 0.7, strobe: 1.2 },
    { type: 'light', x: 28.5, y: 2.8, z: 121, color: 0xffe0a0, range: 7, intensity: 0.9, flicker: 0.2 },
    { type: 'light', x: 12, y: 2.5, z: 150, color: 0xff9050, range: 7, intensity: 0.6, flicker: 0.5 },

    // Derailed train in the widened tunnel.
    { type: 'prop', model: 'train_car', x: 19.5, z: 23, rz: 0.06 },
    { type: 'prop', model: 'crate', x: 16, z: 18 },
    { type: 'prop', model: 'barrel', x: 23.4, z: 30 },
    { type: 'decal', tex: 'graffiti_2', x: 15.05, y: 1.5, z: 20, rot: Math.PI / 2, w: 3, h: 1.5 },

    // Service room
    { type: 'prop', model: 'table', x: 26.5, z: 37.5 },
    { type: 'prop', model: 'radio', x: 26.5, z: 37.5, y: 0.8, collide: false },
    { type: 'prop', model: 'npc', x: 25, z: 40, rx: -Math.PI / 2, rot: 0.4, collide: false, unique: true, tint: [0.6, 0.55, 0.55] },
    { type: 'decal', tex: 'blood', x: 25, y: 0.03, z: 40, rx: -Math.PI / 2, w: 1.6, h: 1.6 },
    { type: 'decal', tex: 'poster_krig', x: 28.95, y: 1.5, z: 38, rot: -Math.PI / 2, w: 0.6, h: 1.2 },

    // Crossover cavern
    { type: 'prop', model: 'crate', x: 10.5, z: 64 },
    { type: 'prop', model: 'barrel', x: 25, z: 74.5 },
    { type: 'decal', tex: 'blood', x: 17.5, y: 0.03, z: 73, rx: -Math.PI / 2, w: 2, h: 2 },
    { type: 'decal', tex: 'graffiti_2', x: 9.05, y: 1.6, z: 70, rot: Math.PI / 2, w: 3, h: 1.5 },

    // Station — abandoned, signs of a last stand.
    { type: 'decal', tex: 'sign_vskogen', x: 14.01, y: 3.1, z: 90, rot: -Math.PI / 2, w: 6, h: 0.75 },
    { type: 'decal', tex: 'sign_vskogen', x: 21.99, y: 3.1, z: 110, rot: Math.PI / 2, w: 6, h: 0.75 },
    { type: 'prop', model: 'bench', x: 16, z: 86, rot: 1.2 },
    { type: 'prop', model: 'bench', x: 20, z: 98, rot: 2.9, rz: 1.4 },
    { type: 'prop', model: 'sandbags', x: 18, z: 116 },
    { type: 'prop', model: 'sandbags', x: 16, z: 116 },
    { type: 'prop', model: 'barrel_fire', x: 19, z: 119, light: false },
    { type: 'prop', model: 'shack', x: 17, z: 124, rot: Math.PI },
    { type: 'prop', model: 'bunk', x: 20.5, z: 104, rot: Math.PI / 2 },
    { type: 'prop', model: 'npc', x: 17, z: 113, rx: -Math.PI / 2, rot: 2, collide: false, unique: true, tint: [0.55, 0.5, 0.5] },
    { type: 'prop', model: 'npc', x: 20, z: 118, rx: -Math.PI / 2, rot: -1, collide: false, unique: true, tint: [0.55, 0.5, 0.5] },
    { type: 'decal', tex: 'blood', x: 17, y: P + 0.03, z: 113, rx: -Math.PI / 2, w: 2, h: 2 },
    { type: 'decal', tex: 'blood', x: 19, y: P + 0.03, z: 101, rx: -Math.PI / 2, w: 1.5, h: 1.5 },
    { type: 'decal', tex: 'blood', x: 20, y: P + 0.03, z: 118, rx: -Math.PI / 2, w: 1.8, h: 1.8 },
    { type: 'decal', tex: 'graffiti_1', x: 10.05, y: 1.5, z: 100, rot: Math.PI / 2, w: 3, h: 1.5 },
    { type: 'box', tex: 'wood_planks', x0: 22, x1: 26, z0: 120, z1: 122, y0: P - 0.25, y1: P },

    // Office
    { type: 'prop', model: 'table', x: 29, z: 120 },
    { type: 'prop', model: 'radio', x: 29, z: 120, y: P + 0.8, collide: false },
    { type: 'prop', model: 'bunk', x: 30.4, z: 123.5, rot: 0 },
    { type: 'use', id: 'radio_log', x: 29, z: 120, y: P, label: 'Läs radiodagboken' },
    { type: 'use', id: 'guard_note', x: 25.5, z: 39.5, y: 0, label: 'Undersök den döde vakten' },

    // Pickups
    { type: 'pickup', kind: 'weapon_kpist', x: 26.5, z: 39.5 },
    { type: 'pickup', kind: 'ammo_9mm', x: 27.5, z: 36.5 },
    { type: 'pickup', kind: 'ammo_rev', x: 16, z: 28 },
    { type: 'pickup', kind: 'filter', x: 23.5, z: 16 },
    { type: 'pickup', kind: 'medkit', x: 10.5, z: 75 },
    { type: 'pickup', kind: 'ammo_9mm', x: 18, z: 117.5 },
    { type: 'pickup', kind: 'ammo_rev', x: 16, z: 117.5 },
    { type: 'pickup', kind: 'mp', amount: 20, x: 30.5, z: 119 },
    { type: 'pickup', kind: 'medkit', x: 27, z: 124.5 },
    { type: 'pickup', kind: 'filter', x: 12, z: 140 },

    // Enemies
    { type: 'enemy', kind: 'rat', x: 20, z: 52, dormant: 'rats1' },
    { type: 'enemy', kind: 'rat', x: 19, z: 55, dormant: 'rats1' },
    { type: 'enemy', kind: 'rat', x: 21, z: 57, dormant: 'rats1' },
    { type: 'enemy', kind: 'rat', x: 20, z: 59, dormant: 'rats1' },
    { type: 'enemy', kind: 'pale', x: 11, z: 74, dormant: 'cross' },
    { type: 'enemy', kind: 'pale', x: 24, z: 75, dormant: 'cross' },
    { type: 'enemy', kind: 'pale', x: 18, z: 95 },
    { type: 'enemy', kind: 'rat', x: 12, z: 92 },
    { type: 'enemy', kind: 'rat', x: 13, z: 97 },
    { type: 'enemy', kind: 'pale', x: 24, z: 100, dormant: 'ambush' },
    { type: 'enemy', kind: 'pale', x: 23, z: 104, dormant: 'ambush' },
    { type: 'enemy', kind: 'pale', x: 12, z: 106, dormant: 'ambush' },
    { type: 'enemy', kind: 'troll', x: 12, z: 145, rot: Math.PI, dormant: 'troll' },
    { type: 'enemy', kind: 'rat', x: 11, z: 160 },
    { type: 'enemy', kind: 'rat', x: 13, z: 165 },

    // Triggers
    { type: 'trigger', id: 'ghost', rect: [18, 9, 21, 10] },
    { type: 'trigger', id: 'rats1', rect: [18, 42, 21, 44] },
    { type: 'trigger', id: 'toxic1', rect: [18, 45, 21, 58], toxic: true, persistent: true },
    { type: 'trigger', id: 'crossover', rect: [15, 63, 22, 65] },
    { type: 'trigger', id: 'station', rect: [10, 80, 25, 82] },
    { type: 'trigger', id: 'ambush', rect: [14, 99, 21, 101] },
    { type: 'trigger', id: 'troll', rect: [10, 132, 13, 134] },
    { type: 'trigger', id: 'exit', rect: [10, 188, 13, 199] },
  ],
};
