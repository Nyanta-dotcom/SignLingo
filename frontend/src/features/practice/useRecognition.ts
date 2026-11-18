import { useEffect, useRef, useState, type RefObject } from 'react';
import { loadActiveManifest } from '@/app/staticData';
import { createClassifier } from '@/vision/classifier';
import { createRecognitionEngine, type RecognitionEvent } from '@/vision/engine';
import { createHandTracker } from '@/vision/landmarker';
import type { ClassTemplate, HandFrame } from '@/vision/types';

export type Recommended = { threshold: number; hold_ms: number; smoothing_window: number };
export type EngineBundle = {
  engine: {
    start(video: HTMLVideoElement): Promise<void>;
    stop(): void;
    subscribe(cb: (e: RecognitionEvent) => void): () => void;
  };
  recommended: Recommended;
  model: { model_id: string; version: string };
};
export type EngineFactory = (o: { onFrame: (f: HandFrame | null) => void }) => Promise<EngineBundle>;

/** Builds the real engine from the published manifest (ONNX classifier + MediaPipe tracker). */
export const realEngineFactory: EngineFactory = async ({ onFrame }) => {
  const manifest = await loadActiveManifest('static_letters');
  const classifier = createClassifier();
  const engine = createRecognitionEngine({
    tracker: createHandTracker(),
    classifier: classifier as never,
    manifest: manifest as never,
    templates: (manifest.class_templates ?? {}) as Record<string, ClassTemplate>,
    confusable: (manifest.confusable ?? {}) as Record<string, string[]>,
    modelUrl: `/models/${manifest.file}`,
    onFrame,
  });
  return { engine, recommended: manifest.recommended, model: { model_id: manifest.model_id, version: manifest.version } };
};

type Prediction = Extract<RecognitionEvent, { type: 'prediction' }>;
type Phase = 'idle' | 'loading' | 'ready' | 'error';

/** Runs the recognition engine against a playing <video>; React only sees throttled events (<= 30 Hz). */
export function useRecognition({
  video, stream, factory = realEngineFactory, onEvent, onFrame,
}: {
  video: RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  factory?: EngineFactory;
  onEvent?: (e: RecognitionEvent, bundle: EngineBundle) => void;
  onFrame?: (f: HandFrame | null) => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [noHandSince, setNoHandSince] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<EngineBundle | null>(null);
  const handlers = useRef({ onEvent, onFrame });
  handlers.current = { onEvent, onFrame };

  useEffect(() => {
    if (!stream) return;
    let cancelled = false;
    let stop = () => {};
    setPhase('loading');
    setError(null);
    (async () => {
      const b = await factory({ onFrame: (f) => handlers.current.onFrame?.(f) });
      if (cancelled) return;
      setBundle(b);
      const off = b.engine.subscribe((e) => {
        handlers.current.onEvent?.(e, b);
        if (e.type === 'loading') setProgress(e.progress);
        else if (e.type === 'ready') setPhase('ready');
        else if (e.type === 'error') { setError(e.message); setPhase('error'); }
        else if (e.type === 'no_hand') { setNoHandSince(e.sinceMs); setPrediction(null); }
        else if (e.type === 'prediction') { setNoHandSince(null); setPrediction(e); }
      });
      stop = () => { off(); b.engine.stop(); };
      if (video.current) await b.engine.start(video.current);
      if (cancelled) stop();
    })().catch((e: Error) => {
      if (cancelled) return;
      setError(e.message);
      setPhase('error');
    });
    return () => {
      cancelled = true;
      stop();
      setPhase('idle');
      setPrediction(null);
    };
  }, [stream, factory, video]);

  return { phase, progress, prediction, noHandSince, error, bundle };
}
