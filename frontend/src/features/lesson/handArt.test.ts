import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { HAND_ART, HAND_LETTERS } from './handArt';

const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'public/models/landmark-mlp-ens5-1.0.0.manifest.json'), 'utf-8'));

describe('hand art', () => {
  it('has a drawing for exactly the letters the model can read (no J or Z)', () => {
    expect([...HAND_LETTERS].sort()).toEqual([...manifest.labels].sort());
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
