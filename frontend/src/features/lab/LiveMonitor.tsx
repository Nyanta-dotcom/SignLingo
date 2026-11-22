import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PredictionBars } from '@/components/ui/PredictionBars';
import { CameraFrame, type CameraFrameState } from '@/components/vision/CameraFrame';
import { drawSkeleton, tokenColor } from '@/components/vision/overlay';
import { useCamera } from '@/hooks/useCamera';
import { vi } from '@/i18n/vi';
import { downloadJson } from '@/lib/downloadJson';
import type { PerfRecord } from '@/storage/types';
import { useLearner } from '@/storage/useLearner';
import type { RecognitionEvent } from '@/vision/engine';
import type { HandFrame } from '@/vision/types';
import { realEngineFactory, useRecognition, type EngineBundle, type EngineFactory, type PerfSnapshot } from '../practice/useRecognition';
import { FpsMeter } from './FpsMeter';
import { smoothBars } from './smoothBars';

const PERF_EVERY_MS = 500;
const RECORD_S = 60;
const ALL_LETTERS = 24;

/** Live Monitor (docs/05 §5.5): all class probabilities, frame timings and a 60 s benchmark (evidence for RQ3). */
export function LiveMonitor({ factory = realEngineFactory }: { factory?: EngineFactory }) {
  const camera = useCamera();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colors = useRef({ ok: '', bad: '' });
  const lastPerf = useRef(-Infinity);
  const recording = useRef<{ startedAt: number; token: number } | null>(null);
  const [perf, setPerf] = useState<PerfSnapshot | null>(null);
  const [bars, setBars] = useState<Record<string, number>>({});
  const [left, setLeft] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<{ record: PerfRecord; saved: boolean } | null>(null);
  const history = useLearner((s) => s.benchmarks);
  const save = useLearner((s) => s.saveBenchmark);

  useEffect(() => {
    colors.current = { ok: tokenColor('overlay-skeleton'), bad: tokenColor('overlay-joint-bad') };
  }, []);

  const onFrame = useCallback((frame: HandFrame | null) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) drawSkeleton(ctx, frame?.landmarks ?? null, { width: canvas.width, height: canvas.height, color: colors.current.ok, badColor: colors.current.bad });
  }, []);

  const onEvent = useCallback((e: RecognitionEvent, bundle: EngineBundle) => {
    if (e.type !== 'prediction' && e.type !== 'no_hand') return;
    if (e.type === 'prediction') setBars((prev) => smoothBars(prev, e.topK));
    const nowMs = performance.now();
    if (nowMs - lastPerf.current >= PERF_EVERY_MS) {
      lastPerf.current = nowMs;
      const p = bundle.engine.getPerf?.();
      if (p && Number.isFinite(p.frameMsP50)) setPerf(p);
    }
    const r = recording.current;
    if (r) setLeft(Math.max(0, Math.ceil(RECORD_S - (nowMs - r.startedAt) / 1000)));
  }, []);

  const rec = useRecognition({ video: videoRef, stream: camera.stream, factory, onFrame, onEvent, topK: ALL_LETTERS });
  const running = camera.status === 'ready' || camera.status === 'loading';

  const cancelRecording = () => {
    recording.current = null;
    setLeft(null);
  };
  const startRecording = async () => {
    const engine = rec.bundle?.engine;
    if (!engine?.recordBenchmark) return;
    const token = Date.now();
    recording.current = { startedAt: performance.now(), token };
    setOutcome(null);
    setLeft(RECORD_S);
    const record = (await engine.recordBenchmark(RECORD_S)) as PerfRecord;
    if (recording.current?.token !== token) return; // camera stopped or leaving the page: discard
    cancelRecording();
    setOutcome({ record, saved: save(record) });
  };
  useEffect(() => cancelRecording, []);

  const frameState = useMemo((): CameraFrameState => {
    if (camera.status === 'error') return camera.error?.code === 'CAMERA_DENIED' ? 'no_permission' : 'error';
    if (rec.phase === 'error') return 'error';
    if (camera.status === 'loading' || rec.phase === 'loading') return 'loading';
    return rec.noHandSince !== null ? 'no_hand' : 'tracking';
  }, [camera.status, camera.error, rec.phase, rec.noHandSince]);

  const t = vi.lab.live;
  const items = rec.prediction ? Object.entries(bars).map(([label, p]) => ({ label, p })).sort((a, b) => a.label.localeCompare(b.label)) : [];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-muted">{t.intro}</p>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="flex flex-col gap-3">
          {running || camera.status === 'error' ? (
            <CameraFrame
              state={frameState} stream={camera.stream} progress={rec.progress} message={rec.error ?? camera.error?.message}
              videoRef={videoRef} canvasRef={canvasRef} onGrant={() => void camera.start()} onRetry={() => void camera.start()}
            />
          ) : (
            <Card className="flex aspect-[4/3] items-center justify-center">
              <Button size="lg" onClick={() => void camera.start()}>{t.start}</Button>
            </Card>
          )}
          <div className="flex flex-wrap items-center gap-3">
            {running && <Button variant="secondary" onClick={() => { cancelRecording(); camera.stop(); }}>{t.stop}</Button>}
            <Button disabled={!running || rec.phase !== 'ready' || left !== null} onClick={() => void startRecording()}>{t.record}</Button>
            {left !== null && <p aria-live="polite" className="font-bold">{t.recording(left)}</p>}
          </div>
          {left !== null && <p className="text-sm text-text-muted">{t.cancelHint}</p>}
          {outcome && (
            <div className="flex flex-wrap items-center gap-3">
              <p role="status" className="font-bold text-success-fg">{outcome.saved ? t.saved : t.saveFailed}</p>
              <Button size="sm" variant="secondary" onClick={() => downloadJson(`benchmark_${outcome.record.recorded_at.slice(0, 19).replace(/[:T]/g, '-')}.json`, outcome.record, true)}>{t.download}</Button>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <Card><FpsMeter perf={perf} /></Card>
          <Card>
            <h3 className="mb-2 font-extrabold">{t.bars}</h3>
            <div className="max-h-96 overflow-y-auto"><PredictionBars items={items} caption={t.bars} /></div>
          </Card>
        </div>
      </div>
      <Card>
        <h3 className="font-extrabold">{t.historyTitle}</h3>
        {history.length === 0 ? <p className="text-text-muted">{t.historyEmpty}</p> : (
          <ul className="mt-2 list-disc pl-5 text-sm">
            {history.map((h) => (
              <li key={h.id}>{t.historyRow(new Date(h.recorded_at).toLocaleString('vi-VN'), h.processing_fps_avg, h.frame_ms.p50, h.frame_ms.p95, `${h.backend}/${h.delegate}`)}</li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
