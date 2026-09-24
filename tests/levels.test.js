import { describe, it, expect } from 'vitest';
import { Grid } from '../src/levels/grid.js';
import { findPath } from '../src/game/pathfinding.js';
import { LEVELS, LEVEL_ORDER } from '../src/levels/index.js';

// Structural validation of every level: entities sit in open cells and all
// objectives are reachable on foot from the spawn point.

const PLAYER = { climb: 1.35, height: 1.7, maxNodes: 60000 };

function firstOpenCell(grid, [x0, z0, x1, z1]) {
  for (let z = z0; z <= z1; z++) {
    for (let x = x0; x <= x1; x++) if (grid.get(x, z)) return [x, z];
  }
  return [x0, z0];
}

function build(def) {
  const g = new Grid(def.size[0], def.size[1]);
  def.build(g);
  return g;
}

describe.each(LEVEL_ORDER)('level %s', (id) => {
  const def = LEVELS[id];
  const grid = build(def);
  const sx = Math.floor(def.spawn.x), sz = Math.floor(def.spawn.z);

  it('has a valid spawn in an open cell', () => {
    expect(grid.get(sx, sz)).toBeTruthy();
  });

  it('places actors, pickups and interactables inside open cells', () => {
    const bad = def.entities
      .filter((e) => ['npc', 'pickup', 'use', 'enemy'].includes(e.type))
      .filter((e) => !grid.get(Math.floor(e.x), Math.floor(e.z)))
      .map((e) => `${e.type}:${e.id ?? e.kind} @ ${e.x},${e.z}`);
    expect(bad).toEqual([]);
  });

  it('keeps props inside the level bounds', () => {
    const bad = def.entities
      .filter((e) => e.type === 'prop')
      .filter((e) => !grid.inBounds(Math.floor(e.x), Math.floor(e.z)))
      .map((e) => `${e.model} @ ${e.x},${e.z}`);
    expect(bad).toEqual([]);
  });

  it('can reach every NPC, interactable and trigger from the spawn', () => {
    const targets = def.entities.filter((e) => e.type === 'npc' || e.type === 'use' || e.type === 'trigger');
    const unreachable = [];
    for (const t of targets) {
      const [tx, tz] = t.rect ? firstOpenCell(grid, t.rect) : [Math.floor(t.x), Math.floor(t.z)];
      if (tx === sx && tz === sz) continue;
      const path = findPath(grid, sx, sz, tx, tz, PLAYER);
      if (!path) unreachable.push(`${t.type}:${t.id} @ ${tx},${tz}`);
    }
    expect(unreachable).toEqual([]);
  });

  it('has an exit or is the final level', () => {
    const hasExit = def.entities.some((e) => e.type === 'trigger' && e.id === 'exit');
    expect(hasExit || def.next === null).toBe(true);
  });

  it('links to an existing next level', () => {
    if (def.next) expect(LEVELS[def.next]).toBeTruthy();
  });
});
