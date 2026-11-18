import { describe, expect, it, vi } from 'vitest';
import { createHandTracker, toHandFrame } from './landmarker';

const hand = (n = 21) => Array.from({ length: n }, (_, i) => ({ x: i / 100, y: i / 50, z: -i / 1000 }));
const result = (landmarks: ReturnType<typeof hand>[] = [hand()], name = 'Left', score = 0.93) => ({
  landmarks,
  handedness: landmarks.map(() => [{ categoryName: name, score }]),
});

describe('toHandFrame', () => {
  it('maps a MediaPipe result to a HandFrame', () => {
    const f = toHandFrame(result(), 1234)!;
    expect(f.landmarks).toHaveLength(21);
    expect(f.landmarks[2]).toEqual({ x: 0.02, y: 0.04, z: -0.002 });
    expect(f).toMatchObject({ handedness: 'Left', score: 0.93, timestampMs: 1234 });
  });
  it('returns null when no hand was found', () => {
    expect(toHandFrame(result([]), 0)).toBeNull();
  });
  it('returns null for a malformed hand instead of passing it on', () => {
    expect(toHandFrame(result([hand(20)]), 0)).toBeNull();
  });
});

describe('HandTracker', () => {
  const OPTS = { delegate: 'GPU', numHands: 1, modelAssetPath: '/m.task', wasmPath: '/wasm' } as const;
  const fake = (detectResult = result()) => ({ detectForVideo: vi.fn(() => detectResult), close: vi.fn() });

  it('uses the GPU delegate when it works and passes the self-hosted paths', async () => {
    const create = vi.fn(async () => fake());
    const t = createHandTracker({ create });
    await t.init(OPTS);
    expect(t.delegate).toBe('GPU');
    expect(create).toHaveBeenCalledWith({ wasmPath: '/wasm', modelAssetPath: '/m.task', delegate: 'GPU', numHands: 1 });
  });

  it('falls back to the CPU delegate when GPU initialisation fails', async () => {
    const create = vi.fn(async (o: { delegate: string }) => {
      if (o.delegate === 'GPU') throw new Error('no webgl');
      return fake();
    });
    const t = createHandTracker({ create });
    await t.init(OPTS);
    expect(t.delegate).toBe('CPU');
    expect(create).toHaveBeenCalledTimes(2);
  });

  it('fails with WEBGL_UNAVAILABLE only when both delegates fail', async () => {
    const t = createHandTracker({ create: vi.fn(async () => { throw new Error('boom'); }) });
    await expect(t.init(OPTS)).rejects.toMatchObject({ code: 'WEBGL_UNAVAILABLE' });
  });

  it('detects through the landmarker, returns null before init, and closes it', async () => {
    const lm = fake();
    const t = createHandTracker({ create: async () => lm });
    expect(t.detect({} as HTMLVideoElement, 1)).toBeNull();
    await t.init(OPTS);
    const frame = t.detect({} as HTMLVideoElement, 42);
    expect(lm.detectForVideo).toHaveBeenCalledWith({}, 42);
    expect(frame?.timestampMs).toBe(42);
    t.close();
    expect(lm.close).toHaveBeenCalled();
    expect(t.detect({} as HTMLVideoElement, 43)).toBeNull();
  });
});
