import { describe, expect, it } from 'vitest';
import { validateLandmarkCapture } from '@/storage/validate';
import { buildCaptureDocument, captureFileName, makeSample } from './captureDoc';
import type { HandFrame } from './types';

const LABELS = 'ABCDEFGHIKLMNOPQRSTUVWXY'.split('');
const frame = (hand: 'Left' | 'Right' = 'Right', shift = 0): HandFrame => ({
  landmarks: Array.from({ length: 21 }, (_, i) => ({ x: 0.1 + i * 0.01 + shift, y: 0.2 + i * 0.012345678, z: -0.001 * i })),
  handedness: hand, score: 0.9, timestampMs: 0,
});

describe('captureDoc', () => {
  it('builds a file that matches landmark_capture.schema.json', () => {
    const s = makeSample('B', [frame(), frame('Right', 0.01)], '2026-01-01T00:00:00Z', LABELS);
    const doc = buildCaptureDocument({ signerId: 'S01', sessionId: 'abc', samples: [s], device: { ua: 'x' } });
    expect(validateLandmarkCapture(doc)).toEqual({ ok: true });
    expect(doc.samples[0].sign_code).toBe('LETTER_B');
    expect(doc.samples[0].frames).toHaveLength(2);
    expect(doc.samples[0].frames[0]).toHaveLength(21);
  });

  it('keeps coordinates unmirrored and rounds them to 5 decimals', () => {
    const f = frame();
    const s = makeSample('A', [f], 't', LABELS);
    expect(s.frames[0][0][0]).toBe(f.landmarks[0].x);
    expect(s.frames[0][1][1]).toBe(Math.round(f.landmarks[1].y * 1e5) / 1e5);
  });

  it('records the majority handedness', () => {
    expect(makeSample('A', [frame('Left'), frame('Left'), frame('Right')], 't', LABELS).handedness).toBe('Left');
    expect(makeSample('A', [frame('Right')], 't', LABELS).handedness).toBe('Right');
  });

  it('rejects letters outside the static classes (J, Z) and empty samples', () => {
    expect(() => makeSample('J', [frame()], 't', LABELS)).toThrow(/static letters/);
    expect(() => makeSample('Z', [frame()], 't', LABELS)).toThrow();
    expect(() => makeSample('A', [], 't', LABELS)).toThrow(/at least one frame/);
  });

  it('rejects a signer code that is not anonymous (S01, S02, …) and an empty file', () => {
    const s = makeSample('A', [frame()], 't', LABELS);
    for (const bad of ['', 'Nguyen Van A', 's01', 'S1', 'S01a']) {
      expect(() => buildCaptureDocument({ signerId: bad, sessionId: 'x', samples: [s] })).toThrow(/anonymous/);
    }
    expect(() => buildCaptureDocument({ signerId: 'S01', sessionId: 'x', samples: [] })).toThrow(/nothing recorded/);
  });

  it('names files like the python tool', () => {
    expect(captureFileName('S02', 1_700_000_123_456)).toBe('landmarks_S02_1700000123.json');
  });
});
