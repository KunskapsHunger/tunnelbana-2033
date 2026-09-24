// Tunable stats for each creature / enemy type.

export const ENEMY_TYPES = {
  rat: {
    model: 'rat', hp: 22, speed: 5.4, radius: 0.25, height: 0.45, climb: 1.15,
    damage: 4, range: 1.05, attackRate: 0.95, sight: 22, reward: 0,
    sounds: { alert: 'rat_squeak', attack: 'rat_squeak', die: 'rat_die', pain: 'rat_squeak' },
    hit: [{ y: 0.22, r: 0.28, part: 'body' }],
    rig: 'quad', pitch: 1.3,
  },
  pale: {
    model: 'pale', hp: 75, speed: 4.3, radius: 0.35, height: 1.7, climb: 1.2,
    damage: 14, range: 1.55, attackRate: 1.05, sight: 28, leap: true, reward: 0,
    sounds: { alert: 'pale_screech', attack: 'pale_attack', die: 'pale_die', pain: 'pale_screech' },
    hit: [{ y: 0.95, r: 0.38, part: 'body' }, { y: 1.5, r: 0.2, part: 'head' }],
    rig: 'biped', pitch: 1,
  },
  raider: {
    model: 'raider', hp: 55, speed: 3.1, radius: 0.33, height: 1.8, climb: 0.45,
    damage: 6, range: 16, attackRate: 1.7, burst: 3, burstGap: 0.14, sight: 30, ranged: true, reward: 4,
    sounds: { alert: 'raider_alert', attack: 'shot_kpist', die: 'raider_die', pain: 'player_hurt_1' },
    hit: [{ y: 1.0, r: 0.36, part: 'body' }, { y: 1.62, r: 0.18, part: 'head' }],
    rig: 'biped', pitch: 1,
  },
  troll: {
    model: 'troll', hp: 340, speed: 2.7, radius: 0.7, height: 2.6, climb: 1.1,
    damage: 30, range: 2.3, attackRate: 1.9, sight: 26, reward: 0, heavy: true,
    sounds: { alert: 'troll_roar', attack: 'troll_attack', die: 'troll_die', pain: 'troll_roar' },
    hit: [{ y: 1.4, r: 0.75, part: 'body' }, { y: 2.35, r: 0.3, part: 'head' }],
    rig: 'biped', pitch: 1,
  },
  mother: {
    model: 'mother', hp: 2600, speed: 1.4, radius: 1.4, height: 4.0, climb: 0.45,
    damage: 38, range: 3.6, attackRate: 2.4, sight: 60, reward: 0, heavy: true, boss: true,
    sounds: { alert: 'mother_roar', attack: 'mother_roar', die: 'mother_die', pain: 'mother_hurt' },
    hit: [{ y: 2.0, r: 1.3, part: 'body' }, { y: 3.5, r: 0.55, part: 'head' }],
    rig: 'biped', pitch: 1,
  },
};
