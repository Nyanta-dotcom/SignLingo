import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadActiveManifest } from '@/app/staticData';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CameraFrame, type CameraFrameState } from '@/components/vision/CameraFrame';
import { drawSkeleton, tokenColor } from '@/components/vision/overlay';
import { useCamera } from '@/hooks/useCamera';
import { vi } from '@/i18n/vi';
import { downloadJson } from '@/lib/downloadJson';
import { buildCaptureDocument, captureFileName, makeSample, SIGNER_RE, type CaptureSample } from '@/vision/captureDoc';
import { createCaptureRecorder, type RecorderState } from '@/vision/captureRecorder';
import type { HandFrame } from '@/vision/types';
import { realEngineFactory, useRecognition, type EngineFactory } from '../practice/useRecognition';

const FRAMES_PER_LETTER = 40;

/** /collect (docs/03 §4): records landmark samples for P1-21 and lets the learner download them. Never stores images. */
export function Collect({ factory = realEngineFactory, labels: given }: { factory?: EngineFactory; labels?: string[] }) {
  const camera = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorder = useRef(createCaptureRecorder({ count: FRAMES_PER_LETTER }));
  const shown = useRef('');
  const colors = useRef({ ok: '', bad: '' });
  const session = useRef(crypto.randomUUID());
  const [labels, setLabels] = useState<string[]>(given ?? []);
  const [signer, setSigner] = useState('');
  const [letter, setLetter] = useState<string | null>(null);
  const [rec, setRec] = useState<RecorderState>({ phase: 'idle' });
  const [samples, setSamples] = useState<Record<string, CaptureSample>>({});
  const [hasHand, setHasHand] = useState(true);

  useEffect(() => {
    colors.current = { ok: tokenColor('overlay-skeleton'), bad: tokenColor('overlay-joint-bad') };
    if (given) return;
    void loadActiveManifest('static_letters').then((m) => setLabels(m.labels));
  }, [given]);

  const onFrame = useCallback((frame: HandFrame | null) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) drawSkeleton(ctx, frame?.landmarks ?? null, { width: canvas.width, height: canvas.height, color: colors.current.ok, badColor: colors.current.bad });
    const s = recorder.current.push(frame, performance.now());
    if (s.phase === 'done') {
      setSamples((all) => ({ ...all, [s.letter]: makeSample(s.letter, s.frames, new Date().toISOString(), labels) }));
      recorder.current.cancel();
      shown.current = '';
      setRec({ phase: 'idle' });
      return;
    }
    const key = s.phase === 'countdown' ? `c${Math.ceil(s.remainingMs / 1000)}` : s.phase === 'recording' ? `r${s.collected}` : s.phase;
    if (key !== shown.current) {
      shown.current = key;
      setRec(s);
    }
    setHasHand(frame !== null);
  }, [labels]);

  const engine = useRecognition({ video: videoRef, stream: camera.stream, factory, onFrame });

  const running = camera.status === 'ready' || camera.status === 'loading';
  const signerOk = SIGNER_RE.test(signer);
  const busy = rec.phase === 'countdown' || rec.phase === 'recording';
  const frameState = useMemo((): CameraFrameState => {
    if (camera.status === 'error') return camera.error?.code === 'CAMERA_DENIED' ? 'no_permission' : 'error';
    if (engine.phase === 'error') return 'error';
    if (camera.status === 'loading' || engine.phase === 'loading') return 'loading';
    return hasHand ? 'tracking' : 'no_hand';
  }, [camera.status, camera.error, engine.phase, hasHand]);

  const begin = (l: string) => {
    recorder.current.start(l, performance.now());
    shown.current = '';
    setRec(recorder.current.state(performance.now()));
  };
  const cancel = () => {
    recorder.current.cancel();
    shown.current = '';
    setRec({ phase: 'idle' });
  };
  const frames = Object.values(samples).reduce((n, s) => n + s.frames.length, 0);

  return (
    <section className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[3fr_2fr]">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-extrabold">{vi.collect.title}</h1>
        <p className="text-text-muted">{vi.collect.intro}</p>
        <p className="font-semibold">{vi.collect.privacy}</p>
        <p role="note" className="text-warning-fg">{vi.collect.warning}</p>
        {running || camera.status === 'error' ? (
          <CameraFrame
            state={frameState} stream={camera.stream} progress={engine.progress} message={engine.error ?? camera.error?.message}
            videoRef={videoRef} canvasRef={canvasRef} onGrant={() => void camera.start()} onRetry={() => void camera.start()}
          />
        ) : (
          <Card className="flex aspect-[4/3] items-center justify-center">
            <Button size="lg" onClick={() => void camera.start()}>{vi.collect.cameraOn}</Button>
          </Card>
        )}
        {running && <div><Button variant="secondary" onClick={() => { cancel(); camera.stop(); }}>{vi.collect.cameraOff}</Button></div>}
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <label htmlFor="signer" className="font-extrabold">{vi.collect.signerLabel}</label>
          <input
            id="signer" value={signer} onChange={(e) => setSigner(e.target.value.trim())} placeholder="S01" autoComplete="off"
            aria-invalid={signer !== '' && !signerOk} aria-describedby="signer-help"
            className="mt-2 min-h-12 w-full rounded-[var(--radius-xl)] border-2 border-border bg-surface px-4 text-lg font-bold"
          />
          <p id="signer-help" className="mt-1 text-sm text-text-muted">{vi.collect.signerHelp}</p>
          {signer !== '' && !signerOk && <p role="alert" className="text-sm font-bold text-danger-on-bg">{vi.collect.signerInvalid}</p>}
        </Card>

        <Card>
          <h2 className="font-extrabold">{vi.collect.letters}</h2>
          <div role="group" aria-label={vi.collect.letters} className="mt-3 grid grid-cols-6 gap-2">
            {labels.map((l) => (
              <button
                key={l} type="button" aria-pressed={letter === l} onClick={() => setLetter(l)} disabled={busy}
                className={`min-h-12 rounded-[var(--radius-xl)] border-2 font-extrabold ${letter === l ? 'border-brand-500 bg-brand-600 text-text-on-brand' : 'border-border bg-surface'}`}
              >
                <span>{l}</span>
                {samples[l] && <span className="block text-xs" aria-label={vi.collect.recorded(samples[l].frames.length)}>✓ {samples[l].frames.length}</span>}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {busy ? (
              <Button variant="secondary" onClick={cancel}>{vi.collect.cancel}</Button>
            ) : (
              <Button disabled={!running || !letter || !signerOk} onClick={() => letter && begin(letter)}>
                {letter ? (samples[letter] ? vi.collect.again(letter) : vi.collect.record(letter)) : vi.collect.pickLetter}
              </Button>
            )}
            <p aria-live="polite" className="font-bold">
              {rec.phase === 'countdown' && vi.collect.countdown(Math.ceil(rec.remainingMs / 1000))}
              {rec.phase === 'recording' && vi.collect.recording(rec.collected, rec.target)}
              {rec.phase === 'recording' && !hasHand && ` · ${vi.collect.noHand}`}
            </p>
          </div>
        </Card>

        <Card>
          <p className="font-bold">{frames ? vi.collect.summary(Object.keys(samples).length, labels.length, frames) : vi.collect.nothing}</p>
          <div className="mt-3">
            <Button
              variant="success" disabled={!frames || !signerOk}
              onClick={() => downloadJson(captureFileName(signer, Date.now()), buildCaptureDocument({
                signerId: signer, sessionId: session.current, samples: Object.values(samples),
                device: { user_agent: navigator.userAgent, width: videoRef.current?.videoWidth, height: videoRef.current?.videoHeight },
              }))}
            >
              {vi.collect.download}
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
}
