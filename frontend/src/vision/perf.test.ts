import { describe, expect, it } from 'vitest';
import { createPerfMonitor, percentile } from './perf';

describe('percentile (nearest rank)', () => {
  const v = Array.from({ length: 100 }, (_, i) => i + 1);
  it('p50 and p95 of 1..100', () => {
    expect(percentile(v, 50)).toBe(50);
    expect(percentile(v, 95)).toBe(95);
    expect(percentile([...v].reverse(), 95)).toBe(95); // order does not matter
  });
  it('handles tiny inputs and empty input', () => {
    expect(percentile([7], 95)).toBe(7);
    expect(percentile([], 50)).toBeNaN();
  });
});

describe('PerfMonitor', () => {
  it('reports p50/p95 per stage and processing FPS from timestamps', () => {
    const m = createPerfMonitor({ windowSize: 300 });
    for (let i = 0; i < 100; i++) m.record({ nowMs: i * 20, frameMs: i + 1, mpMs: 5, clsMs: 1 });
    const s = m.snapshot();
    expect(s.frameMsP50).toBe(50);
    expect(s.frameMsP95).toBe(95);
    expect(s.mpMsP50).toBe(5);
    expect(s.clsMsP50).toBe(1);
    expect(s.processingFps).toBeCloseTo(50, 1); // one frame every 20 ms
    expect(s.frames).toBe(100);
  });

  it('only keeps the latest window of samples', () => {
    const m = createPerfMonitor({ windowSize: 10 });
    for (let i = 0; i < 50; i++) m.record({ nowMs: i * 10, frameMs: i, mpMs: 1, clsMs: 1 });
    expect(m.snapshot().frames).toBe(10);
    expect(m.snapshot().frameMsP50).toBe(44); // frames 40..49 -> median is the 5th
  });

  it('counts a gap longer than the drop threshold as dropped frames', () => {
    const m = createPerfMonitor({ windowSize: 100, dropGapMs: 50 });
    [0, 20, 40, 200, 220].forEach((t) => m.record({ nowMs: t, frameMs: 10, mpMs: 5, clsMs: 1 }));
    expect(m.snapshot().droppedFrames).toBe(1);
  });

  it('is all NaN-safe when empty and can be reset', () => {
    const m = createPerfMonitor();
    expect(m.snapshot().frames).toBe(0);
    expect(m.snapshot().processingFps).toBe(0);
    m.record({ nowMs: 0, frameMs: 1, mpMs: 1, clsMs: 1 });
    m.reset();
    expect(m.snapshot().frames).toBe(0);
  });
});
