import { describe, expect, it } from 'vitest';
import { createCaptureRecorder } from './captureRecorder';
import type { HandFrame } from './types';

const hand = (n = 0): HandFrame => ({
  landmarks: Array.from({ length: 21 }, () => ({ x: n, y: n, z: 0 })), handedness: 'Right', score: 0.9, timestampMs: n,
});

describe('captureRecorder', () => {
  it('is idle until started', () => {
    expect(createCaptureRecorder().state(0)).toEqual({ phase: 'idle' });
  });

  it('counts down 3 s and drops the frames seen meanwhile', () => {
    const r = createCaptureRecorder({ count: 2 });
    r.start('A', 1000);
    expect(r.push(hand(), 1500)).toEqual({ phase: 'countdown', letter: 'A', remainingMs: 2500 });
    expect(r.push(hand(), 3999)).toMatchObject({ phase: 'countdown', remainingMs: 1 });
    expect(r.push(null, 4000)).toEqual({ phase: 'recording', letter: 'A', collected: 0, target: 2 });
  });

  it('keeps exactly `count` frames with a hand and then finishes', () => {
    const r = createCaptureRecorder({ count: 3, countdownMs: 0 });
    r.start('B', 0);
    r.push(hand(1), 10);
    expect(r.push(null, 20)).toMatchObject({ phase: 'recording', collected: 1 });
    r.push(hand(2), 30);
    const end = r.push(hand(3), 40);
    expect(end.phase).toBe('done');
    if (end.phase === 'done') expect(end.frames.map((f) => f.timestampMs)).toEqual([1, 2, 3]);
    expect(r.push(hand(4), 50)).toMatchObject({ phase: 'done' });
    expect((r.state(60) as { frames: HandFrame[] }).frames).toHaveLength(3);
  });

  it('cancel discards everything, and start again begins a fresh take', () => {
    const r = createCaptureRecorder({ count: 2, countdownMs: 0 });
    r.start('C', 0);
    r.push(hand(), 1);
    r.cancel();
    expect(r.state(2)).toEqual({ phase: 'idle' });
    r.start('C', 3);
    expect(r.state(3)).toMatchObject({ phase: 'recording', collected: 0 });
  });
});
