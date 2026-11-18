import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HoldRing } from '@/components/ui/HoldRing';
import { PredictionBars } from '@/components/ui/PredictionBars';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CameraFrame, type CameraFrameState } from '@/components/vision/CameraFrame';
import { drawSkeleton, tokenColor } from '@/components/vision/overlay';
import type { Lesson } from '@/content/types';
import { lessonStatus } from '@/game/unlock';
import { letterOf, performConfig } from '@/game/lessonFlow';
import { useCamera } from '@/hooks/useCamera';
import { vi } from '@/i18n/vi';
import { createSound } from '@/lib/sound';
import { useLearner } from '@/storage/useLearner';
import type { FingerHint, HandFrame } from '@/vision/types';
import { loadLearnData, type LearnData } from '../skill-tree/SkillTree';
import { realEngineFactory, useRecognition, type EngineFactory } from '../practice/useRecognition';
import { FeedbackBanner } from './FeedbackBanner';
import { LessonResult } from './LessonResult';
import { useLessonRun } from './useLessonRun';

type Live = { label: string; confidence: number; topK: Array<{ label: string; p: number }>; progress: number; fingers: FingerHint[]; confused: string | null };
const NO_HAND_AFTER_MS = 2000;

/** /lesson/:code (docs/05 §5.2): cards and hold-to-verify signs, hearts, feedback and a result screen. */
export function LessonPlayer({ load = loadLearnData, factory = realEngineFactory }: { load?: () => Promise<LearnData>; factory?: EngineFactory }) {
  const { code } = useParams();
  const progress = useLearner((s) => s.progress);
  const hearts = useLearner((s) => s.stats.hearts);
  const [data, setData] = useState<LearnData | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Hearts only gate the START of a lesson; running out in the middle is handled by the run itself.
  const [gate, setGate] = useState<'unknown' | 'open' | 'blocked'>('unknown');

  useEffect(() => {
    let live = true;
    load().then((d) => live && setData(d)).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [load]);

  useEffect(() => {
    if (data && gate === 'unknown') setGate(hearts === 0 ? 'blocked' : 'open');
  }, [data, gate, hearts]);

  const lesson = data?.curriculum.units.flatMap((u) => u.lessons).find((l) => l.code === code);
  const t = vi.lesson;
  const back = <Link to="/learn" className="font-bold text-brand-fg underline">{t.toPath}</Link>;
  if (failed) return <Notice text={vi.learn.loadError} action={back} alert />;
  if (!data) return <Notice text={vi.learn.loading} />;
  if (!lesson) return <Notice text={t.notFound} action={back} />;
  if (lessonStatus(lesson, progress) === 'locked') return <Notice text={t.locked} action={back} />;
  if (gate === 'unknown') return <Notice text={vi.learn.loading} />;
  if (gate === 'blocked') return <Notice text={t.noHeartsStart} action={<><Link to="/practice" className="font-bold text-brand-fg underline">{t.toPractice}</Link> · {back}</>} />;
  return <Run key={attempt} lesson={lesson} model={data.model} factory={factory} onRetry={() => { setGate(hearts === 0 ? 'blocked' : 'open'); setAttempt((n) => n + 1); }} />;
}

function Notice({ text, action, alert }: { text: string; action?: React.ReactNode; alert?: boolean }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
      <p role={alert ? 'alert' : undefined} className="text-lg font-bold">{text}</p>
      {action}
    </main>
  );
}

function Run({ lesson, model, factory, onRetry }: { lesson: Lesson; model: LearnData['model']; factory: EngineFactory; onRetry: () => void }) {
  const navigate = useNavigate();
  const run = useLessonRun(lesson, model);
  const hearts = useLearner((s) => s.stats.hearts);
  const soundOn = useLearner((s) => s.settings.sound_on);
  const deviceId = useLearner((s) => s.settings.camera_device_id);
  const camera = useCamera(deviceId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const colors = useRef({ ok: '', bad: '' });
  const hidden = useRef(false);
  const last = useRef<{ label: string | null; confidence: number | null; confused: string | null }>({ label: null, confidence: null, confused: null });
  const soundFlag = useRef(soundOn);
  soundFlag.current = soundOn;
  const sound = useMemo(() => createSound({ enabled: () => soundFlag.current }), []);
  const [live, setLive] = useState<Live | null>(null);
  const [hideSkeleton, setHideSkeleton] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const isPerform = run.phase !== 'done' && run.phase !== 'no_hearts' && run.item.type === 'perform_sign';
  const performing = isPerform && run.phase === 'item';

  const onFrame = useCallback((frame: HandFrame | null) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) drawSkeleton(ctx, hidden.current ? null : (frame?.landmarks ?? null), { width: canvas.width, height: canvas.height, color: colors.current.ok, badColor: colors.current.bad });
  }, []);

  const rec = useRecognition({
    video: videoRef, stream: camera.stream, factory, onFrame,
    onEvent: (e) => {
      if (e.type === 'prediction') {
        last.current = { label: e.label, confidence: e.confidence, confused: e.confusedWith };
        setLive({ label: e.label, confidence: e.confidence, topK: e.topK, progress: e.hold.progress, fingers: e.fingers, confused: e.confusedWith });
      } else if (e.type === 'verified' && performing) {
        sound.play('correct');
        run.answer({ result: 'correct', label: e.label, confidence: last.current.confidence ?? 1, timeToVerifyMs: e.timeToVerifyMs });
      } else if (e.type === 'timed_out' && performing) {
        sound.play('wrong');
        run.answer({ result: 'timed_out', lastLabel: e.lastLabel, lastConfidence: e.lastConfidence, confusedWith: last.current.confused });
      }
    },
  });

  useEffect(() => {
    colors.current = { ok: tokenColor('overlay-skeleton'), bad: tokenColor('overlay-joint-bad') };
  }, []);
  useEffect(() => {
    hidden.current = hideSkeleton;
  }, [hideSkeleton]);

  // Point the engine at the sign the learner has to make; stop watching between items.
  const engine = rec.bundle?.engine;
  const recommended = rec.bundle?.recommended;
  const target = performing && run.item.sign_code ? letterOf(run.item.sign_code) : null;
  const item = run.item;
  useEffect(() => {
    if (!engine?.setTarget || !recommended || rec.phase !== 'ready') return;
    last.current = { label: null, confidence: null, confused: null };
    setLive(null);
    if (target) engine.setTarget(target, performConfig(item, recommended));
    else engine.setTarget(null);
  }, [engine, recommended, rec.phase, target, item]);

  useEffect(() => {
    if (run.phase === 'done') sound.play('finish');
  }, [run.phase, sound]);

  const skip = () => {
    if (!performing) return;
    engine?.setTarget?.(null);
    run.answer({ result: 'skipped', lastLabel: last.current.label, lastConfidence: last.current.confidence });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'Escape') setConfirmExit((v) => !v);
      else if (e.key.toLowerCase() === 'h' && isPerform) setHideSkeleton((v) => !v);
      else if (e.key.toLowerCase() === 's' && performing) skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const running = camera.status === 'ready' || camera.status === 'loading';
  const noHand = rec.noHandSince !== null && rec.noHandSince >= NO_HAND_AFTER_MS;
  const frameState: CameraFrameState = camera.status === 'error'
    ? (camera.error?.code === 'CAMERA_DENIED' ? 'no_permission' : 'error')
    : rec.phase === 'error' ? 'error' : camera.status === 'loading' || rec.phase === 'loading' ? 'loading' : noHand ? 'no_hand' : run.phase === 'feedback' && run.feedback?.kind === 'correct' ? 'verified' : 'tracking';

  const t = vi.lesson;
  if (run.phase === 'done') return <LessonResult result={run.result} onFinish={() => navigate('/learn')} onRetry={onRetry} />;
  if (run.phase === 'no_hearts') {
    return <Notice text={t.noHeartsEnd} action={<><Link to="/practice" className="font-bold text-brand-fg underline">{t.toPractice}</Link> · <Link to="/learn" className="font-bold text-brand-fg underline">{t.toPath}</Link></>} />;
  }

  const letter = run.item.sign_code ? letterOf(run.item.sign_code) : '';
  const finished = run.phase === 'feedback' ? run.index + 1 : run.index;

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-4 p-4">
      <header className="flex items-center gap-4">
        <button type="button" aria-label={t.close} onClick={() => setConfirmExit(true)} className="min-h-11 min-w-11 rounded-full text-2xl font-bold text-text-muted hover:bg-surface-2">
          <span aria-hidden="true">✕</span>
        </button>
        <ProgressBar value={finished} max={run.items.length} label={t.progress} className="flex-1" />
        <span className="font-bold">{t.step(finished, run.items.length)}</span>
        <span className="font-bold" role="img" aria-label={t.hearts(hearts)}>❤ {hearts}</span>
      </header>

      {confirmExit && (
        <div role="alertdialog" aria-label={t.closeAsk} className="flex flex-col gap-3 rounded-[var(--radius-xl)] border-2 border-danger-fg p-4">
          <p className="font-bold">{t.closeAsk} {t.closeWarn}</p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={() => navigate('/learn')}>{t.closeYes}</Button>
            <Button variant="secondary" onClick={() => setConfirmExit(false)}>{t.closeNo}</Button>
          </div>
        </div>
      )}

      <main className="grid flex-1 gap-6 lg:grid-cols-2">
        {run.item.type === 'learn_card' && (
          <Card className="col-span-full flex flex-col items-center gap-4 py-10 text-center">
            <h1 className="text-2xl font-extrabold">{t.cardTitle(letter)}</h1>
            <p aria-label={t.cardLetter} className="text-9xl font-extrabold text-brand-fg">{letter}</p>
            <p className="text-text-muted">{t.cardText}</p>
            <Button size="lg" onClick={run.advance}>{t.next}</Button>
          </Card>
        )}

        {isPerform && (
          <>
            <div className="flex flex-col items-center gap-4">
              <h1 className="text-xl font-extrabold">{t.perform}</h1>
              <HoldRing progress={performing ? (live?.progress ?? 0) : run.feedback?.kind === 'correct' ? 1 : 0} label={t.holdRing}>
                <span role="img" aria-label={t.current(letter)} className="text-8xl font-extrabold">{letter}</span>
              </HoldRing>
              {performing && live?.confused && <p role="status" className="rounded-full bg-surface-2 px-4 py-1 font-bold text-warning-fg">{t.nearMiss(live.confused)}</p>}
              {performing && live && live.fingers.length > 0 && (
                <ul aria-label={vi.fingers.list} className="flex flex-col gap-1 text-sm">
                  {live.fingers.slice(0, 2).map((f) => <li key={`${f.finger}${f.joint}`}>{f.hint}</li>)}
                </ul>
              )}
              {performing && live && <div className="w-full max-w-sm"><PredictionBars items={live.topK.slice(0, 3)} caption={vi.practice.top3} /></div>}
            </div>
            <div className="flex flex-col gap-3">
              {running || camera.status === 'error' ? (
                <CameraFrame
                  state={frameState} stream={camera.stream} progress={rec.progress} message={rec.error ?? camera.error?.message}
                  videoRef={videoRef} canvasRef={canvasRef} onGrant={() => void camera.start()} onRetry={() => void camera.start()}
                />
              ) : (
                <Card className="flex aspect-[4/3] flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="font-extrabold">{t.cameraStart}</p>
                  <p className="text-sm text-text-muted">{t.cameraWhy}</p>
                  <Button size="lg" onClick={() => void camera.start()}>{t.cameraStartBtn}</Button>
                </Card>
              )}
              <div className="flex flex-wrap gap-3">
                <Button variant="ghost" onClick={() => setHideSkeleton((h) => !h)}>{hideSkeleton ? t.showSkeleton : t.hideSkeleton}</Button>
                <Button variant="secondary" disabled={!performing} onClick={skip}>{t.skip}</Button>
              </div>
            </div>
          </>
        )}
      </main>

      {run.phase === 'feedback' && run.feedback && <FeedbackBanner feedback={run.feedback} onContinue={run.advance} />}
    </div>
  );
}
