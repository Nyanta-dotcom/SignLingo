import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HoldRing } from '@/components/ui/HoldRing';
import { PlayIcon } from '@/components/ui/Icons';
import { PredictionBars } from '@/components/ui/PredictionBars';
import { CameraFrame, type CameraFrameState } from '@/components/vision/CameraFrame';
import { drawSkeleton, drawTrail, tokenColor } from '@/components/vision/overlay';
import { useCamera } from '@/hooks/useCamera';
import { vi } from '@/i18n/vi';
import { useLearner } from '@/storage/useLearner';
import { createPassiveDynamicDetector } from '@/vision/dynamicGesture';
import { createLetterTyper, type LetterTyper } from '@/vision/letterTyper';
import type { HandFrame } from '@/vision/types';
import { realEngineFactory, useRecognition, type EngineFactory } from './useRecognition';

const NO_HAND_AFTER_MS = 2000;
const ANNOUNCE_EVERY_MS = 1000;

const CAMERA_MESSAGES = {
  CAMERA_NOT_FOUND: vi.camera.notFound,
  INSECURE_CONTEXT: vi.camera.insecure,
} as const;

/** Free Practice: hold a static sign (1s) or trace dynamic J / Z to type it; never costs hearts or XP. */
export function Practice({ factory = realEngineFactory }: { factory?: EngineFactory }) {
  const deviceId = useLearner((s) => s.settings.camera_device_id);
  const camera = useCamera(deviceId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hidden = useRef(false);
  const [hideSkeleton, setHideSkeleton] = useState(false);
  const typer = useRef<LetterTyper | null>(null);
  const dynamic = useRef(createPassiveDynamicDetector());
  const [typed, setTyped] = useState({ text: '', progress: 0, candidate: null as string | null });
  const [dynamicFlash, setDynamicFlash] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const lastAnnounce = useRef({ at: -Infinity, label: '' });
  const colors = useRef({ ok: '', bad: '' });

  const onFrame = useCallback((frame: HandFrame | null) => {
    const nowMs = performance.now();
    const dyn = dynamic.current.update(frame, nowMs);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      drawSkeleton(ctx, hidden.current ? null : (frame?.landmarks ?? null), {
        width: canvas.width, height: canvas.height, color: colors.current.ok, badColor: colors.current.bad,
      });
      if (dyn.trail.length > 1) {
        drawTrail(ctx, dyn.trail, { width: canvas.width, height: canvas.height, color: colors.current.ok });
      }
    }

    if (dyn.detected) {
      typer.current ??= createLetterTyper({ holdMs: 1000, threshold: 0.6, graceMs: 150 });
      typer.current.append(dyn.detected);
      setTyped({ text: typer.current.text(), progress: 1, candidate: dyn.detected });
      setDynamicFlash(dyn.detected);
      setAnnouncement(vi.practice.recognised(dyn.detected, 100));
    }
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
        setDynamicFlash(null);
      } else if (e.type === 'prediction') {
        const r = typer.current.update({ label: e.label, confidence: e.confidence, nowMs });
        setTyped({ text: r.text, progress: r.progress, candidate: r.candidate });
        if (r.progress > 0.2) setDynamicFlash(null);
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
    dynamic.current.reset();
    setDynamicFlash(null);
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
        <div>
          <h1 className="text-3xl font-black tracking-tight text-text">{vi.practice.title}</h1>
          <p className="mt-1 text-text-muted">{vi.practice.intro}</p>
        </div>
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
          <Card className="flex aspect-[4/3] flex-col items-center justify-center gap-4 border-dashed border-brand-300 bg-brand-50/40">
            <Button size="lg" onClick={() => void camera.start()}>
              <PlayIcon className="size-4" />
              {vi.practice.start}
            </Button>
          </Card>
        )}
        <div className="flex flex-wrap gap-3">
          {running && <Button variant="secondary" onClick={stopAll}>{vi.practice.stop}</Button>}
          <Button variant="ghost" onClick={() => setHideSkeleton((h) => !h)}>
            {hideSkeleton ? vi.practice.showSkeleton : vi.practice.hideSkeleton}
          </Button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-5">
        <Card className="flex w-full flex-col items-center gap-5">
          <HoldRing progress={typed.progress} label={vi.practice.holdRing}>
            <span aria-label={vi.practice.current} className="text-8xl font-black text-text">
              {dynamicFlash ?? p?.label ?? vi.practice.none}
            </span>
          </HoldRing>
          <div className="w-full">
            <PredictionBars items={p?.topK ?? []} caption={vi.practice.top3} />
          </div>
        </Card>
        <Card className="w-full">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">{vi.practice.typed}</h2>
          <p aria-live="polite" className="mt-2 min-h-12 whitespace-pre-wrap break-words rounded-2xl bg-surface-2 px-4 py-2.5 text-3xl font-black tracking-widest text-text">
            {typed.text || <span className="text-base font-semibold tracking-normal text-text-muted">{vi.practice.typedEmpty}</span>}
          </p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => edit((t) => t.space())}>{vi.practice.space}</Button>
            <Button size="sm" variant="secondary" onClick={() => edit((t) => t.backspace())}>{vi.practice.backspace}</Button>
            <Button size="sm" variant="ghost" onClick={() => edit((t) => t.clear())}>{vi.practice.clear}</Button>
          </div>
        </Card>
        {rec.bundle && (
          <p className="rounded-full bg-surface-2 px-4 py-1.5 text-xs font-extrabold text-text-muted">
            {vi.practice.aiNote}: {rec.bundle.model.model_id} {rec.bundle.model.version}
          </p>
        )}
      </div>
    </section>
  );
}
