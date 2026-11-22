import { describe, expect, it } from 'vitest';
import { HAND_ART, HAND_LETTERS } from './handArt';

const FULL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const NUMBERS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

describe('hand art', () => {
  it('has a drawing for all 26 ASL letters and numbers 1–10 with motion arrows on J, Z, 10', () => {
    expect([...HAND_LETTERS].sort()).toEqual([...FULL_ALPHABET, ...NUMBERS].sort());
    expect(HAND_ART.J.motion).toBeDefined();
    expect(HAND_ART.Z.motion).toBeDefined();
    expect(HAND_ART['10'].motion).toBeDefined();
  });

  it('draws every hand with at least one shape, all inside the 200 x 260 box before turning', () => {
    for (const letter of HAND_LETTERS) {
      const art = HAND_ART[letter];
      expect(art.layers.length, letter).toBeGreaterThan(0);
      for (const l of art.layers) {
        if (l.kind !== 'limb') continue;
        for (const [x, y] of l.pts) {
          expect(x, `${letter} x`).toBeGreaterThanOrEqual(0);
          expect(x, `${letter} x`).toBeLessThanOrEqual(200);
          expect(y, `${letter} y`).toBeGreaterThanOrEqual(0);
          expect(y, `${letter} y`).toBeLessThanOrEqual(260);
        }
      }
    }
  });

  it('shrinks the sideways and pointing-down hands so they fit when turned', () => {
    for (const letter of HAND_LETTERS) {
      const turned = Math.abs(HAND_ART[letter].rotate ?? 0) % 180 !== 0 || HAND_ART[letter].rotate === 180;
      if (turned) expect(HAND_ART[letter].scale, letter).toBeLessThan(1);
    }
  });
});
