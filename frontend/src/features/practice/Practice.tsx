import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HoldRing } from '@/components/ui/HoldRing';
import { PredictionBars } from '@/components/ui/PredictionBars';
import { CameraFrame, type CameraFrameState } from '@/components/vision/CameraFrame';
import { drawSkeleton, tokenColor } from '@/components/vision/overlay';
import { useCamera } from '@/hooks/useCamera';
import { vi } from '@/i18n/vi';
import { useLearner } from '@/storage/useLearner';
import { createLetterTyper, type LetterTyper } from '@/vision/letterTyper';
import type { HandFrame } from '@/vision/types';
import { realEngineFactory, useRecognition, type EngineFactory } from './useRecognition';

const NO_HAND_AFTER_MS = 2000;
const ANNOUNCE_EVERY_MS = 1000;

const CAMERA_MESSAGES = {
  CAMERA_NOT_FOUND: vi.camera.notFound,
  INSECURE_CONTEXT: vi.camera.insecure,
} as const;

/** Free Practice (docs/05 §5.4, FT-LRN-07): hold a sign to type it; never costs hearts or XP. */
export function Practice({ factory = realEngineFactory }: { factory?: EngineFactory }) {
  const deviceId = useLearner((s) => s.settings.camera_device_id);
  const camera = useCamera(deviceId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hidden = useRef(false);
  const [hideSkeleton, setHideSkeleton] = useState(false);
  const typer = useRef<LetterTyper | null>(null);
  const [typed, setTyped] = useState({ text: '', progress: 0, candidate: null as string | null });
  const [announcement, setAnnouncement] = useState('');
  const lastAnnounce = useRef({ at: -Infinity, label: '' });
  const colors = useRef({ ok: '', bad: '' });

  const onFrame = useCallback((frame: HandFrame | null) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    drawSkeleton(ctx, hidden.current ? null : (frame?.landmarks ?? null), {
      width: canvas.width, height: canvas.height, color: colors.current.ok, badColor: colors.current.bad,
    });
  }, []);

  const rec = useRecognition({
    video: videoRef,
    stream: camera.stream,
    factory,
    onFrame,
    onEvent: (e, bundle) => {
      const nowMs = performance.now();
      typer.current ??= createLetterTyper({
        holdMs: bundle.recommended.hold_ms, threshold: bundle.recommended.threshold, graceMs: 150,
      });
      if (e.type === 'no_hand') {
        const r = typer.current.update({ label: null, confidence: 0, nowMs });
        setTyped({ text: r.text, progress: 0, candidate: null });
      } else if (e.type === 'prediction') {
        const r = typer.current.update({ label: e.label, confidence: e.confidence, nowMs });
        setTyped({ text: r.text, progress: r.progress, candidate: r.candidate });
        const last = lastAnnounce.current;
        if (e.label !== last.label && nowMs - last.at >= ANNOUNCE_EVERY_MS) {
          lastAnnounce.current = { at: nowMs, label: e.label };
          setAnnouncement(vi.practice.recognised(e.label, Math.round(e.confidence * 100)));
        }
      }
    },
  });

  useEffect(() => {
    colors.current = { ok: tokenColor('overlay-skeleton'), bad: tokenColor('overlay-joint-bad') };
  }, []);
  useEffect(() => {
    hidden.current = hideSkeleton;
  }, [hideSkeleton]);

  const stopAll = () => {
    camera.stop();
    typer.current = null;
    setTyped({ text: '', progress: 0, candidate: null });
  };
  const edit = (fn: (t: LetterTyper) => void) => {
    typer.current ??= createLetterTyper({ holdMs: 1000, threshold: 0.6, graceMs: 150 });
    fn(typer.current);
    setTyped((s) => ({ ...s, text: typer.current?.text() ?? '' }));
  };

  const frameState = useMemo((): CameraFrameState => {
    if (camera.status === 'error') return camera.error?.code === 'CAMERA_DENIED' ? 'no_permission' : 'error';
    if (rec.phase === 'error') return 'error';
    if (camera.status === 'loading' || rec.phase === 'loading') return 'loading';
    if (rec.noHandSince !== null && rec.noHandSince >= NO_HAND_AFTER_MS) return 'no_hand';
    return 'tracking';
  }, [camera.status, camera.error, rec.phase, rec.noHandSince]);

  const message = rec.error ?? (camera.error && camera.error.code !== 'CAMERA_DENIED' ? (CAMERA_MESSAGES[camera.error.code as keyof typeof CAMERA_MESSAGES] ?? camera.error.message) : undefined);
  const running = camera.status === 'ready' || camera.status === 'loading';
  const p = rec.prediction;

  return (
    <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">{vi.practice.title}</h1>
        <p className="text-text-muted">{vi.practice.intro}</p>
        {running || camera.status === 'error' ? (
          <CameraFrame
            state={frameState}
            stream={camera.stream}
            progress={rec.progress}
            message={message}
            announcement={announcement}
            videoRef={videoRef}
            canvasRef={canvasRef}
            onGrant={() => void camera.start()}
            onRetry={() => void camera.start()}
          />
        ) : (
          <Card className="flex aspect-[4/3] items-center justify-center">
            <Button size="lg" onClick={() => void camera.start()}>{vi.practice.start}</Button>
          </Card>
        )}
        <div className="flex flex-wrap gap-3">
          {running && <Button variant="secondary" onClick={stopAll}>{vi.practice.stop}</Button>}
          <Button variant="ghost" onClick={() => setHideSkeleton((h) => !h)}>
            {hideSkeleton ? vi.practice.showSkeleton : vi.practice.hideSkeleton}
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <HoldRing progress={typed.progress} label={vi.practice.holdRing}>
          <span aria-label={vi.practice.current} className="text-8xl font-extrabold">{p?.label ?? vi.practice.none}</span>
        </HoldRing>
        <div className="w-full">
          <PredictionBars items={p?.topK ?? []} caption={vi.practice.top3} />
        </div>
        <Card className="w-full">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-text-muted">{vi.practice.typed}</h2>
          <p aria-live="polite" className="min-h-12 whitespace-pre-wrap break-words text-3xl font-extrabold tracking-widest">
            {typed.text || <span className="text-base font-semibold text-text-muted">{vi.practice.typedEmpty}</span>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => edit((t) => t.space())}>{vi.practice.space}</Button>
            <Button size="sm" variant="secondary" onClick={() => edit((t) => t.backspace())}>{vi.practice.backspace}</Button>
            <Button size="sm" variant="ghost" onClick={() => edit((t) => t.clear())}>{vi.practice.clear}</Button>
          </div>
        </Card>
        {rec.bundle && (
          <p className="text-sm text-text-muted">
            {vi.practice.aiNote}: {rec.bundle.model.model_id} {rec.bundle.model.version}
          </p>
        )}
      </div>
    </section>
  );
}
