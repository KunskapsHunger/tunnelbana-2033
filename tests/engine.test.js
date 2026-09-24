import { describe, it, expect } from 'vitest';
import { Grid, STEP_HEIGHT } from '../src/levels/grid.js';
import { findPath } from '../src/game/pathfinding.js';
import { wrapText, textWidth, drawText } from '../src/engine/bitmapFont.js';
import { fbm3, mulberry32 } from '../src/engine/noise.js';

function room() {
  const g = new Grid(20, 20);
  g.carve(2, 2, 17, 17, { floor: 0, ceil: 4 });
  return g;
}

describe('Grid collision', () => {
  it('pushes a circle out of solid rock', () => {
    const g = room();
    const [x, z] = g.collideCircle(2.1, 5, 0.3, 0, 1.7);
    expect(x).toBeGreaterThanOrEqual(2.3 - 1e-6);
    expect(z).toBeCloseTo(5);
  });

  it('allows steps below STEP_HEIGHT and blocks higher ledges', () => {
    const g = room();
    g.carve(10, 2, 17, 17, { floor: STEP_HEIGHT - 0.05, ceil: 4 });
    expect(g.cellBlocks(10, 5, 0, 1.7)).toBe(false);
    g.carve(10, 2, 17, 17, { floor: 1.0, ceil: 4 });
    expect(g.cellBlocks(10, 5, 0, 1.7)).toBe(true);
  });

  it('treats boxes as walkable tops', () => {
    const g = room();
    g.addBox(5, 5, 7, 7, 0.75, 1.0);
    expect(g.floorAt(6, 6, 1.5)).toBe(1.0);
    expect(g.floorAt(6, 6, 0.5)).toBe(0);
  });

  it('raycasts into walls and reports the hit distance', () => {
    const g = room();
    const hit = g.raycast(5, 1.5, 5, 1, 0, 0, 30);
    expect(hit).toBeTruthy();
    expect(hit.dist).toBeGreaterThan(12.5);
    expect(hit.dist).toBeLessThan(13.1);
    expect(hit.normal.x).toBe(-1);
  });

  it('computes line of sight', () => {
    const g = room();
    expect(g.lineOfSight(4, 1.5, 4, 15, 1.5, 15)).toBe(true);
    g.fillSolid(8, 2, 9, 17);
    expect(g.lineOfSight(4, 1.5, 4, 15, 1.5, 15)).toBe(false);
  });
});

describe('Pathfinding', () => {
  it('finds a path around a wall', () => {
    const g = room();
    g.fillSolid(8, 2, 9, 14);
    const p = findPath(g, 4, 4, 15, 4);
    expect(p).toBeTruthy();
    expect(p.at(-1)).toEqual([15, 4]);
    expect(p.some(([, z]) => z >= 15)).toBe(true);
  });

  it('respects climb height', () => {
    const g = room();
    g.carve(10, 2, 17, 17, { floor: 1.0, ceil: 4 });
    expect(findPath(g, 4, 4, 15, 4, { climb: 0.45 })).toBeNull();
    expect(findPath(g, 4, 4, 15, 4, { climb: 1.2 })).toBeTruthy();
  });

  it('returns null for unreachable targets', () => {
    const g = room();
    expect(findPath(g, 4, 4, 0, 0)).toBeNull();
  });
});

describe('Bitmap font', () => {
  it('wraps text to a pixel width', () => {
    const lines = wrapText('Vem kan segla förutan vind, vem kan ro utan åror', 60);
    expect(lines.length).toBeGreaterThan(3);
    for (const l of lines) expect(textWidth(l)).toBeLessThanOrEqual(60 + 6 * 10);
  });

  it('draws Swedish characters with their marks', () => {
    const rows = (ch) => {
      const ys = new Set();
      drawText({ fillRect: (x, y) => ys.add(y), set fillStyle(v) { void v; } }, ch, 0, 0, '#fff', { shadow: null });
      return ys;
    };
    expect(rows('Å').has(0)).toBe(true);
    expect(rows('Ä').has(0)).toBe(true);
    expect(rows('A').has(0)).toBe(true);
  });
});

describe('Noise', () => {
  it('is deterministic and bounded', () => {
    expect(fbm3(1.3, 2.2, 3.1)).toBe(fbm3(1.3, 2.2, 3.1));
    for (let i = 0; i < 200; i++) {
      const v = fbm3(i * 0.37, i * 0.11, i * 0.73);
      expect(Math.abs(v)).toBeLessThanOrEqual(1);
    }
  });

  it('seeded RNG repeats', () => {
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 10; i++) expect(a()).toBe(b());
  });
});
