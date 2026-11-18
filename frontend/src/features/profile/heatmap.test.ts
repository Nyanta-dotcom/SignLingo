import { describe, expect, it } from 'vitest';
import { buildHeatmap, heatLevel } from './heatmap';

describe('heatLevel', () => {
  it('grows with the share of the daily goal', () => {
    expect([0, 5, 10, 19, 20, 39, 40, 100].map((xp) => heatLevel(xp, 20))).toEqual([0, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe('buildHeatmap', () => {
  // 2026-03-04 is a Wednesday.
  it('builds 12 Monday-first weeks ending in the week of today, marking later days as future', () => {
    const grid = buildHeatmap({}, '2026-03-04', 20);
    expect(grid).toHaveLength(12);
    expect(grid.every((w) => w.length === 7)).toBe(true);
    const last = grid[11];
    expect(last[0].date).toBe('2026-03-02');
    expect(last[2].date).toBe('2026-03-04');
    expect(last.map((d) => d.future)).toEqual([false, false, false, true, true, true, true]);
    expect(grid[0][0].date).toBe('2025-12-15');
  });

  it('fills days from the stored daily activity', () => {
    const grid = buildHeatmap({ '2026-03-03': { xp_earned: 25, lessons_completed: 1, goal_met: true } }, '2026-03-04', 20);
    expect(grid[11][1]).toMatchObject({ date: '2026-03-03', xp: 25, level: 3 });
    expect(grid[11][0]).toMatchObject({ xp: 0, level: 0 });
  });

  it('crosses a year boundary without skipping or repeating a day', () => {
    const dates = buildHeatmap({}, '2026-01-02', 20).flat().map((d) => d.date);
    expect(new Set(dates).size).toBe(dates.length);
    expect(dates).toContain('2025-12-31');
    expect(dates).toContain('2026-01-01');
  });
});
