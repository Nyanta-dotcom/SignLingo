import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { normalizeLandmarks } from './normalizer';
import type { HandFrame } from './types';

const fixture = JSON.parse(
  readFileSync(resolve(process.cwd(), '../shared/contracts/fixtures/landmarks_lm-v1.json'), 'utf8'),
) as { tolerance: number; cases: Array<{ kind: string; input: HandFrame; expected: number[] | null }> };

describe('normalizeLandmarks lm-v1 (AC-ML-09)', () => {
  it('uses the same tolerance the Python side wrote', () => {
    expect(fixture.tolerance).toBe(1e-6);
  });

  it('matches every Python fixture case within the tolerance (null where degenerate)', () => {
    expect(fixture.cases.length).toBeGreaterThan(50);
    for (const c of fixture.cases) {
      const out = normalizeLandmarks(c.input);
      if (c.expected === null) {
        expect(out, c.kind).toBeNull();
        continue;
      }
      expect(out, c.kind).not.toBeNull();
      expect(out!.length).toBe(42);
      c.expected.forEach((v, i) => expect(Math.abs(out![i] - v), `${c.kind}[${i}]`).toBeLessThanOrEqual(fixture.tolerance));
    }
  });

  it('puts the wrist at the origin and the largest coordinate at exactly 1', () => {
    const frame = fixture.cases[0].input;
    const out = normalizeLandmarks(frame)!;
    expect([out[0], out[1]]).toEqual([0, 0]);
    expect(Math.max(...Array.from(out, Math.abs))).toBeCloseTo(1, 6);
  });

  it('rejects frames that do not have 21 landmarks', () => {
    expect(() => normalizeLandmarks({ ...fixture.cases[0].input, landmarks: [] })).toThrow(/21/);
  });
});
