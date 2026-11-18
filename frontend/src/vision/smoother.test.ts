import { describe, expect, it } from 'vitest';
import { createSmoother } from './smoother';

const labels = ['A', 'B', 'C', 'D'];
const probs = (...p: number[]) => Float32Array.from(p);

describe('Smoother', () => {
  it('returns the top label, its confidence and the top-3 sorted by probability', () => {
    const s = createSmoother(labels, 5);
    const r = s.push(probs(0.1, 0.6, 0.25, 0.05));
    expect(r.label).toBe('B');
    expect(r.confidence).toBeCloseTo(0.6);
    expect(r.topK.map((t) => t.label)).toEqual(['B', 'C', 'A']);
  });

  it('averages over the window so one noisy frame does not flip the label', () => {
    const s = createSmoother(labels, 5);
    for (let i = 0; i < 4; i++) s.push(probs(0.8, 0.1, 0.05, 0.05));
    const r = s.push(probs(0.05, 0.9, 0.025, 0.025)); // outlier
    expect(r.label).toBe('A');
  });

  it('forgets frames older than the window', () => {
    const s = createSmoother(labels, 3);
    for (let i = 0; i < 3; i++) s.push(probs(0.9, 0.05, 0.025, 0.025));
    s.push(probs(0.05, 0.9, 0.025, 0.025));
    const r = s.push(probs(0.05, 0.9, 0.025, 0.025));
    expect(r.label).toBe('B');
  });

  it('reset clears the history', () => {
    const s = createSmoother(labels, 5);
    for (let i = 0; i < 5; i++) s.push(probs(0.9, 0.05, 0.025, 0.025));
    s.reset();
    expect(s.push(probs(0.05, 0.9, 0.025, 0.025)).label).toBe('B');
  });

  it('rejects a probability vector of the wrong length', () => {
    expect(() => createSmoother(labels, 5).push(probs(1, 0))).toThrow(/4/);
  });
});
