import { describe, expect, it } from 'vitest';
import { smoothBars } from './smoothBars';

describe('smoothBars', () => {
  it('starts from the first prediction as is', () => {
    expect(smoothBars({}, [{ label: 'A', p: 0.8 }, { label: 'B', p: 0.2 }])).toEqual({ A: 0.8, B: 0.2 });
  });

  it('moves part of the way toward each new prediction, so one noisy frame does not make the bars jump', () => {
    const s = smoothBars({ A: 0.8, B: 0.2 }, [{ label: 'A', p: 0 }, { label: 'B', p: 1 }], 0.25);
    expect(s.A).toBeCloseTo(0.6);
    expect(s.B).toBeCloseTo(0.4);
  });

  it('a steady prediction is reached after a few frames', () => {
    let s: Record<string, number> = { A: 0 };
    for (let i = 0; i < 15; i++) s = smoothBars(s, [{ label: 'A', p: 1 }]);
    expect(s.A).toBeGreaterThan(0.99);
  });
});
