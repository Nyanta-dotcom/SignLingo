/**
 * RecognitionEngine (docs/04 K3): one frame loop that runs the tracker, normalizer, classifier,
 * smoother and hold FSM and tells React about it through throttled events (<= 30 Hz). The frame
 * loop itself never touches React state. Framework-free so it can move into a Web Worker later.
 */

import { fingerFeedback } from './fingerFeedback';
import { createHoldVerifier } from './holdFsm';
import { normalizeLandmarks } from './normalizer';
import { createPerfMonitor } from './perf';
import { createSmoother } from './smoother';
import type { ClassTemplate, FingerHint, HandFrame, HoldCfg, HoldState } from './types';

export type RecognitionEvent =
  | { type: 'loading'; progress: number }
  | { type: 'ready'; backend: 'webgpu' | 'wasm'; delegate: 'GPU' | 'CPU' }
  | { type: 'no_hand'; sinceMs: number }
  | {
      type: 'prediction'; label: string; confidence: number; topK: Array<{ label: string; p: number }>;
      hold: { state: HoldState; progress: number }; fingers: FingerHint[]; confusedWith: string | null;
    }
  | { type: 'verified'; label: string; timeToVerifyMs: number }
  | { type: 'timed_out'; target: string; lastLabel: string | null; lastConfidence: number | null }
  | { type: 'error'; code: 'CAMERA_DENIED' | 'CAMERA_NOT_FOUND' | 'MODEL_LOAD_FAILED' | 'WEBGL_UNAVAILABLE' | 'INSECURE_CONTEXT'; message: string };

type Manifest = {
  model_id: string; version: string; labels: string[]; file?: string; sha256?: string;
  recommended: { threshold: number; hold_ms: number; smoothing_window: number };
};
type Tracker = { init(o: { delegate: 'GPU' | 'CPU'; numHands: 1; modelAssetPath: string; wasmPath: string }): Promise<void>; detect(v: HTMLVideoElement, ts: number): HandFrame | null; close(): void; readonly delegate: 'GPU' | 'CPU' };
type Clf = { load(m: never, url: string): Promise<void>; predict(f: Float32Array): Promise<{ probs: Float32Array; latencyMs: number }>; readonly backend: 'webgpu' | 'wasm' };

export type EngineDeps = {
  tracker: Tracker;
  classifier: Clf;
  manifest: Manifest;
  templates: Record<string, ClassTemplate>;
  confusable: Record<string, string[]>;
  /** Called with every detected frame (or null), unthrottled, for drawing straight onto a canvas. */
  onFrame?: (frame: HandFrame | null) => void;
  scheduleFrame?: (cb: (nowMs: number) => Promise<void>, video: HTMLVideoElement) => () => void;
  wait?: (ms: number) => Promise<void>;
  now?: () => number;
  wasmPath?: string;
  modelAssetPath?: string;
  modelUrl?: string;
};

const EVENT_INTERVAL_MS = 1000 / 30;
const ERROR_CODES = ['CAMERA_DENIED', 'CAMERA_NOT_FOUND', 'MODEL_LOAD_FAILED', 'WEBGL_UNAVAILABLE', 'INSECURE_CONTEXT'] as const;

function defaultSchedule(cb: (t: number) => Promise<void>, video: HTMLVideoElement): () => void {
  let id = 0;
  if ('requestVideoFrameCallback' in video) {
    id = video.requestVideoFrameCallback((t) => void cb(t));
    return () => video.cancelVideoFrameCallback(id);
  }
  id = requestAnimationFrame((t) => void cb(t));
  return () => cancelAnimationFrame(id);
}

export function createRecognitionEngine(deps: EngineDeps) {
  const { tracker, classifier, manifest, templates, confusable } = deps;
  const schedule = deps.scheduleFrame ?? defaultSchedule;
  const wait = deps.wait ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = deps.now ?? (() => performance.now());
  const listeners = new Set<(e: RecognitionEvent) => void>();
  const perf = createPerfMonitor();
  const smoother = createSmoother(manifest.labels, manifest.recommended.smoothing_window);
  const hold = createHoldVerifier();

  let video: HTMLVideoElement | null = null;
  let cancel: (() => void) | null = null;
  let running = false;
  let busy = false;
  let target: string | null = null;
  let attemptStart: number | null = null;
  let noHandSince: number | null = null;
  let lastEmit = -Infinity;
  let last: { label: string | null; confidence: number | null } = { label: null, confidence: null };
  let bench: ReturnType<typeof createPerfMonitor> | null = null;

  const emit = (e: RecognitionEvent) => listeners.forEach((l) => l(e));
  const throttled = (t: number, e: RecognitionEvent) => {
    if (t - lastEmit < EVENT_INTERVAL_MS) return;
    lastEmit = t;
    emit(e);
  };

  async function onFrame(nowMs: number) {
    if (!running || !video || busy) return;
    busy = true;
    const t0 = now();
    try {
      const frame = tracker.detect(video, nowMs);
      const mpMs = now() - t0;
      deps.onFrame?.(frame);
      if (!frame) {
        noHandSince ??= nowMs;
        smoother.reset();
        if (target) hold.update({ label: null, confidence: 0, nowMs });
        throttled(nowMs, { type: 'no_hand', sinceMs: nowMs - noHandSince });
        return;
      }
      noHandSince = null;
      const features = normalizeLandmarks(frame);
      if (!features) return;
      const { probs, latencyMs } = await classifier.predict(features);
      const pred = smoother.push(probs);
      last = { label: pred.label, confidence: pred.confidence };
      attemptStart ??= nowMs;

      let state: { state: HoldState; progress: number } = { state: 'idle', progress: 0 };
      if (target) state = hold.update({ label: pred.label, confidence: pred.confidence, nowMs });
      if (state.state === 'verified') {
        emit({ type: 'verified', label: pred.label, timeToVerifyMs: nowMs - attemptStart });
        target = null;
        return;
      }
      if (state.state === 'timed_out') {
        emit({ type: 'timed_out', target: target ?? '', lastLabel: last.label, lastConfidence: last.confidence });
        target = null;
        return;
      }
      const template = target ? templates[target] : undefined;
      const confused = target && pred.label !== target && (confusable[target] ?? []).includes(pred.label) ? pred.label : null;
      throttled(nowMs, {
        type: 'prediction', label: pred.label, confidence: pred.confidence, topK: pred.topK,
        hold: state, fingers: template ? fingerFeedback(frame, template) : [], confusedWith: confused,
      });
      const sample = { nowMs, frameMs: now() - t0, mpMs, clsMs: latencyMs };
      perf.record(sample);
      bench?.record(sample);
    } finally {
      busy = false;
      if (running) cancel = schedule(onFrame, video);
    }
  }

  return {
    async start(v: HTMLVideoElement): Promise<void> {
      video = v;
      emit({ type: 'loading', progress: 0 });
      try {
        await tracker.init({
          delegate: 'GPU', numHands: 1,
          modelAssetPath: deps.modelAssetPath ?? '/mediapipe/hand_landmarker.task',
          wasmPath: deps.wasmPath ?? '/mediapipe/wasm',
        });
        emit({ type: 'loading', progress: 0.5 });
        await classifier.load(manifest as never, deps.modelUrl ?? `/models/${manifest.file ?? ''}`);
      } catch (e) {
        const code = (e as { code?: string }).code;
        emit({
          type: 'error',
          code: (ERROR_CODES as readonly string[]).includes(code ?? '') ? (code as (typeof ERROR_CODES)[number]) : 'MODEL_LOAD_FAILED',
          message: (e as Error).message,
        });
        return;
      }
      emit({ type: 'ready', backend: classifier.backend, delegate: tracker.delegate });
      running = true;
      cancel = schedule(onFrame, v);
    },
    stop(): void {
      running = false;
      cancel?.();
      cancel = null;
      tracker.close();
    },
    setTarget(next: string | null, cfg: Partial<HoldCfg> = {}): void {
      target = next;
      attemptStart = null;
      smoother.reset();
      if (next) {
        hold.reset(next, {
          holdMs: manifest.recommended.hold_ms, threshold: manifest.recommended.threshold,
          graceMs: 150, timeLimitMs: Infinity, ...cfg,
        });
      }
    },
    subscribe(cb: (e: RecognitionEvent) => void): () => void {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getPerf() {
      const s = perf.snapshot();
      return {
        processingFps: s.processingFps, frameMsP50: s.frameMsP50, frameMsP95: s.frameMsP95,
        mpMsP50: s.mpMsP50, clsMsP50: s.clsMsP50,
        backend: classifier.backend, delegate: tracker.delegate, worker: false,
      };
    },
    async recordBenchmark(durationS: number) {
      bench = createPerfMonitor({ windowSize: 100_000 });
      const started = new Date();
      await wait(durationS * 1000);
      const s = bench.snapshot();
      bench = null;
      const settings = (video?.srcObject as MediaStream | null)?.getVideoTracks?.()[0]?.getSettings?.();
      return {
        id: crypto.randomUUID(), recorded_at: started.toISOString(), duration_s: durationS,
        model: { model_id: manifest.model_id, version: manifest.version },
        backend: classifier.backend, delegate: tracker.delegate, worker: false,
        camera: { width: video?.videoWidth ?? 0, height: video?.videoHeight ?? 0, fps_reported: settings?.frameRate ?? 0 },
        frame_ms: { p50: s.frameMsP50, p95: s.frameMsP95, max: s.frameMsMax },
        mp_ms: { p50: s.mpMsP50, p95: s.mpMsP95 }, cls_ms: { p50: s.clsMsP50, p95: s.clsMsP95 },
        processing_fps_avg: s.processingFps, dropped_frames: s.droppedFrames, user_agent: navigator.userAgent,
      };
    },
  };
}

export type RecognitionEngine = ReturnType<typeof createRecognitionEngine>;
