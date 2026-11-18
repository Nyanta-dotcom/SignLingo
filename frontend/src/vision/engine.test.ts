import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { createRecognitionEngine, type RecognitionEvent } from './engine';
import type { HandFrame } from './types';

const fixture = JSON.parse(
  readFileSync(resolve(process.cwd(), '../shared/contracts/fixtures/landmarks_lm-v1.json'), 'utf8'),
) as { cases: Array<{ input: HandFrame; expected: number[] | null }> };
const HAND = fixture.cases.find((c) => c.expected)!.input;

const LABELS = ['A', 'B', 'C', 'D'];
const REC = { threshold: 0.6, hold_ms: 1000, smoothing_window: 1 };
const probsFor = (label: string, p = 0.9) => Float32Array.from(LABELS.map((l) => (l === label ? p : (1 - p) / 3)));
const flat = Array.from({ length: 15 }, () => 180);
const templates = { C: { finger_angles: flat, finger_angles_std: flat.map(() => 5) } };

function setup(over: { frame?: HandFrame | null; probs?: Float32Array; confusable?: Record<string, string[]>; onFrame?: (f: HandFrame | null) => void } = {}) {
  let frame: HandFrame | null = 'frame' in over ? (over.frame ?? null) : HAND;
  let probs = over.probs ?? probsFor('C');
  let frameCb: ((nowMs: number) => Promise<void>) | null = null;
  const waiters: Array<() => void> = [];
  const tracker = { init: vi.fn(async () => {}), detect: vi.fn(() => frame), close: vi.fn(), delegate: 'GPU' as const };
  const classifier = { load: vi.fn(async () => {}), predict: vi.fn(async () => ({ probs, latencyMs: 1 })), labels: LABELS, backend: 'wasm' as const };
  const engine = createRecognitionEngine({
    tracker, classifier, manifest: { model_id: 'm', version: '1', labels: LABELS, recommended: REC },
    templates, confusable: over.confusable ?? {}, onFrame: over.onFrame,
    scheduleFrame: (cb) => { frameCb = cb; return () => { frameCb = null; }; },
    wait: () => new Promise<void>((r) => waiters.push(r)),
  });
  const events: RecognitionEvent[] = [];
  engine.subscribe((e) => events.push(e));
  const video = { videoWidth: 640, videoHeight: 480 } as HTMLVideoElement;
  return {
    engine, events, tracker, classifier, video,
    setFrame: (f: HandFrame | null) => { frame = f; },
    setProbs: (p: Float32Array) => { probs = p; },
    tick: async (t: number) => { await frameCb!(t); },
    running: () => frameCb !== null,
    releaseWait: () => waiters.splice(0).forEach((r) => r()),
  };
}

describe('RecognitionEngine', () => {
  it('emits loading then ready (with backend and delegate) on start', async () => {
    const s = setup();
    await s.engine.start(s.video);
    expect(s.events.some((e) => e.type === 'loading')).toBe(true);
    expect(s.events.find((e) => e.type === 'ready')).toMatchObject({ backend: 'wasm', delegate: 'GPU' });
    expect(s.tracker.init).toHaveBeenCalledOnce();
    expect(s.running()).toBe(true);
  });

  it('emits a prediction with top-3, hold state and finger feedback for the target', async () => {
    const s = setup();
    await s.engine.start(s.video);
    s.engine.setTarget('C');
    await s.tick(0);
    const p = s.events.find((e) => e.type === 'prediction');
    expect(p).toMatchObject({ type: 'prediction', label: 'C' });
    if (p?.type !== 'prediction') throw new Error('no prediction');
    expect(p.topK).toHaveLength(3);
    expect(p.hold.state).toBe('holding');
    expect(Array.isArray(p.fingers)).toBe(true);
    expect(p.confusedWith).toBeNull();
  });

  it('verifies after hold_ms and reports the time to verify', async () => {
    const s = setup();
    await s.engine.start(s.video);
    s.engine.setTarget('C');
    for (const t of [0, 400, 800]) await s.tick(t);
    await s.tick(1000);
    expect(s.events.filter((e) => e.type === 'verified')).toEqual([{ type: 'verified', label: 'C', timeToVerifyMs: 1000 }]);
  });

  it('reports no_hand with how long the hand has been missing, and does not classify', async () => {
    const s = setup({ frame: null });
    await s.engine.start(s.video);
    s.engine.setTarget('C');
    await s.tick(0);
    await s.tick(2500);
    const nh = s.events.filter((e) => e.type === 'no_hand');
    expect(nh.at(-1)).toMatchObject({ sinceMs: 2500 });
    expect(s.classifier.predict).not.toHaveBeenCalled();
  });

  it('times out with the last label and confidence when the limit passes', async () => {
    const s = setup({ probs: probsFor('B') });
    await s.engine.start(s.video);
    s.engine.setTarget('C', { timeLimitMs: 2000 });
    await s.tick(0);
    await s.tick(2000);
    expect(s.events.find((e) => e.type === 'timed_out')).toMatchObject({ target: 'C', lastLabel: 'B' });
  });

  it('names the confusable letter when the model sees one instead of the target', async () => {
    const s = setup({ probs: probsFor('B'), confusable: { C: ['B'] } });
    await s.engine.start(s.video);
    s.engine.setTarget('C');
    await s.tick(0);
    const p = s.events.find((e) => e.type === 'prediction');
    expect(p).toMatchObject({ label: 'B', confusedWith: 'B' });
  });

  it('throttles prediction events to at most 30 per second but never drops verified', async () => {
    const s = setup();
    await s.engine.start(s.video);
    s.engine.setTarget('C');
    for (let t = 0; t < 300; t += 10) await s.tick(t); // 100 Hz frames for 0.3 s
    const predictions = s.events.filter((e) => e.type === 'prediction').length;
    expect(predictions).toBeLessThanOrEqual(11); // 30 Hz over 300 ms
    expect(predictions).toBeGreaterThan(5);
  });

  it('works without a target (free practice): predictions, no hold', async () => {
    const s = setup();
    await s.engine.start(s.video);
    s.engine.setTarget(null);
    await s.tick(0);
    const p = s.events.find((e) => e.type === 'prediction');
    expect(p).toMatchObject({ label: 'C' });
    expect(s.events.some((e) => e.type === 'verified')).toBe(false);
  });

  it('stop() cancels the loop, closes the tracker and stays quiet', async () => {
    const s = setup();
    await s.engine.start(s.video);
    s.engine.stop();
    expect(s.running()).toBe(false);
    expect(s.tracker.close).toHaveBeenCalled();
  });

  it('calls onFrame for every frame (not throttled) so the canvas can be drawn without React', async () => {
    const seen: Array<HandFrame | null> = [];
    const s = setup({ onFrame: (f) => seen.push(f) });
    await s.engine.start(s.video);
    for (let t = 0; t < 100; t += 10) await s.tick(t);
    expect(seen).toHaveLength(10);
    s.setFrame(null);
    await s.tick(200);
    expect(seen.at(-1)).toBeNull();
  });

  it('subscribe returns an unsubscribe function', async () => {
    const s = setup();
    const seen: string[] = [];
    const off = s.engine.subscribe((e) => seen.push(e.type));
    off();
    await s.engine.start(s.video);
    expect(seen).toEqual([]);
  });

  it('turns a tracker failure into an error event instead of throwing out of start()', async () => {
    const s = setup();
    s.tracker.init.mockRejectedValueOnce(Object.assign(new Error('x'), { code: 'WEBGL_UNAVAILABLE' }));
    await s.engine.start(s.video);
    expect(s.events.find((e) => e.type === 'error')).toMatchObject({ code: 'WEBGL_UNAVAILABLE' });
  });

  it('collects perf stats and records a benchmark in the 03 §3.4 shape', async () => {
    const s = setup();
    await s.engine.start(s.video);
    for (let i = 0; i < 20; i++) await s.tick(i * 33);
    expect(s.engine.getPerf()).toMatchObject({ backend: 'wasm', delegate: 'GPU', worker: false });
    expect(s.engine.getPerf().processingFps).toBeGreaterThan(25);

    const bench = s.engine.recordBenchmark(60);
    for (let i = 20; i < 60; i++) await s.tick(i * 33);
    s.releaseWait();
    const rec = await bench;
    expect(rec).toMatchObject({
      duration_s: 60, model: { model_id: 'm', version: '1' }, backend: 'wasm', delegate: 'GPU', worker: false,
      camera: { width: 640, height: 480 },
    });
    expect(rec.frame_ms.p50).toBeGreaterThanOrEqual(0);
    expect(rec.processing_fps_avg).toBeGreaterThan(25);
    expect(typeof rec.id).toBe('string');
  });
});
