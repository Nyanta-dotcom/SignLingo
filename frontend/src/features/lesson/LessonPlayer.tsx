import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HoldRing } from '@/components/ui/HoldRing';
import { HeartIcon } from '@/components/ui/Icons';
import { PredictionBars } from '@/components/ui/PredictionBars';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CameraFrame, type CameraFrameState } from '@/components/vision/CameraFrame';
import { drawSkeleton, tokenColor } from '@/components/vision/overlay';
import type { Lesson, Sign } from '@/content/types';
import { msToNextHeart } from '@/game/hearts';
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
import { LearnCard } from './LearnCard';
import { ReferenceHand } from './ReferenceHand';
import { LessonResult } from './LessonResult';
import { useLessonRun } from './useLessonRun';
import { useSpeller } from './useSpeller';

type Live = { label: string; confidence: number; topK: Array<{ label: string; p: number }>; progress: number; fingers: FingerHint[]; confused: string | null };
const NO_HAND_AFTER_MS = 2000;

/** /lesson/:code: cards and hold-to-verify signs, hearts, feedback and a result screen. */
export function LessonPlayer({ load = loadLearnData, factory = realEngineFactory }: { load?: () => Promise<LearnData>; factory?: EngineFactory }) {
  const { code } = useParams();
  const progress = useLearner((s) => s.progress);
  const hearts = useLearner((s) => s.stats.hearts);
  const heartStats = useLearner((s) => s.stats);
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
  const wait = msToNextHeart(heartStats, Date.now());
  if (gate === 'blocked') return <Notice text={t.noHeartsStart + (wait === null ? '' : ` ${t.nextHeart(Math.max(1, Math.ceil(wait / 60_000)))}`)} action={<><Link to="/practice" className="font-bold text-brand-fg underline">{t.toPractice}</Link> · {back}</>} />;
  return <Run key={attempt} lesson={lesson} signs={data.curriculum.signs} model={data.model} factory={factory} onRetry={() => { setGate(hearts === 0 ? 'blocked' : 'open'); setAttempt((n) => n + 1); }} />;
}

function Notice({ text, action, alert }: { text: string; action?: React.ReactNode; alert?: boolean }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 p-4 text-center">
      <Card className="flex flex-col items-center gap-4 p-8">
        <p role={alert ? 'alert' : undefined} className="text-lg font-bold">{text}</p>
        <div>{action}</div>
      </Card>
    </main>
  );
}

function Run({ lesson, signs, model, factory, onRetry }: { lesson: Lesson; signs: Sign[]; model: LearnData['model']; factory: EngineFactory; onRetry: () => void }) {
  const navigate = useNavigate();
  const run = useLessonRun(lesson, model);
  const { speller, refresh } = useSpeller(run.item);
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
  const isSign = run.phase !== 'done' && run.phase !== 'no_hearts' && (run.item.type === 'perform_sign' || run.item.type === 'spell_word');
  const performing = isSign && run.phase === 'item';

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
        if (speller) {
          const was = speller.ready();
          speller.observe(e.label);
          if (!was && speller.ready()) refresh();
        }
        setLive({ label: e.label, confidence: e.confidence, topK: e.topK, progress: e.hold.progress, fingers: e.fingers, confused: e.confusedWith });
      } else if (e.type === 'no_hand' && speller) {
        const was = speller.ready();
        speller.observe(null);
        if (!was && speller.ready()) refresh();
      } else if (e.type === 'verified' && performing) {
        sound.play('correct');
        const outcome = { result: 'correct', label: e.label, confidence: last.current.confidence ?? 1, timeToVerifyMs: e.timeToVerifyMs } as const;
        if (speller) {
          const letter = speller.current() ?? e.label;
          speller.verified();
          run.answer(outcome, { expected: letter, shown: speller.letters.join(''), more: !speller.done() });
          refresh();
        } else {
          run.answer(outcome);
        }
      } else if (e.type === 'timed_out' && performing) {
        sound.play('wrong');
        run.answer(
          { result: 'timed_out', lastLabel: e.lastLabel, lastConfidence: e.lastConfidence, confusedWith: last.current.confused },
          speller ? { expected: speller.current() ?? undefined, shown: speller.letters.join('') } : {},
        );
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
  const spellTarget = speller && speller.ready() ? speller.current() : null;
  const target = !performing ? null : speller ? spellTarget : run.item.sign_code ? letterOf(run.item.sign_code) : null;
  const item = run.item;
  useEffect(() => {
    if (!engine?.setTarget || !recommended || rec.phase !== 'ready') return;
    last.current = { label: null, confidence: null, confused: null };
    setLive(null);
    if (target) engine.setTarget(target, performConfig(item, recommended));
    else engine.setTarget(null);
  }, [engine, recommended, rec.phase, target, item]);

  useEffect(() => {
    if (run.phase === 'done' && (!run.result || run.result.record.status === 'completed')) sound.play('finish');
  }, [run.phase, run.result, sound]);

  const skip = () => {
    if (!performing) return;
    engine?.setTarget?.(null);
    run.answer(
      { result: 'skipped', lastLabel: last.current.label, lastConfidence: last.current.confidence },
      speller ? { expected: speller.current() ?? undefined, shown: speller.letters.join('') } : {},
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      if (e.key === 'Escape') setConfirmExit((v) => !v);
      else if (e.key.toLowerCase() === 'h' && isSign) setHideSkeleton((v) => !v);
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

  const letter = speller ? (speller.current() ?? speller.letters.at(-1) ?? '') : run.item.sign_code ? letterOf(run.item.sign_code) : '';
  const finished = run.phase === 'feedback' ? run.index + 1 : run.index;

  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-5 p-4 md:p-6">
      <header className="flex items-center gap-3.5 rounded-full border-2 border-border bg-surface px-3 py-2 shadow-(--card-shadow)">
        <button
          type="button"
          aria-label={t.close}
          onClick={() => setConfirmExit(true)}
          className="inline-flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full text-xl font-bold text-text-muted transition-colors hover:bg-brand-50 hover:text-brand-fg"
        >
          <span aria-hidden="true">✕</span>
        </button>
        <ProgressBar value={finished} max={run.items.length} label={t.progress} className="flex-1" />
        <span className="text-sm font-extrabold tabular-nums text-text-muted">{t.step(finished, run.items.length)}</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm font-extrabold tabular-nums text-heart" role="img" aria-label={t.hearts(hearts)}>
          <HeartIcon className="size-4" />
          <span>{hearts}</span>
        </span>
      </header>

      {confirmExit && (
        <div role="alertdialog" aria-label={t.closeAsk} className="flex flex-col gap-3 rounded-3xl border-2 border-danger-fg bg-surface p-5 shadow-(--card-shadow)">
          <p className="font-extrabold">{t.closeAsk} {t.closeWarn}</p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={() => navigate('/learn')}>{t.closeYes}</Button>
            <Button variant="secondary" onClick={() => setConfirmExit(false)}>{t.closeNo}</Button>
          </div>
        </div>
      )}

      <main className="grid flex-1 gap-6 lg:grid-cols-2">
        {run.item.type === 'learn_card' && <LearnCard letter={letter} sign={signs.find((x) => x.code === run.item.sign_code)} onNext={run.advance} />}

        {isSign && (
          <Card className="flex flex-col items-center justify-center gap-5">
            <h1 className="rounded-full bg-brand-50 px-4 py-1 text-sm font-extrabold uppercase tracking-wider text-brand-fg">
              {speller ? t.spell : t.perform}
            </h1>
            {speller && (
              <ol aria-label={t.wordCells(speller.letters.join(''))} className="flex gap-2">
                {speller.letters.map((l, i) => {
                  const state = i < speller.position() ? 'done' : i === speller.position() ? 'current' : 'todo';
                  return (
                    <li
                      key={`${l}${i}`}
                      data-state={state}
                      aria-label={`${l}: ${t.cellState[state]}`}
                      className={`flex size-12 items-center justify-center rounded-2xl border-2 text-xl font-black ${
                        state === 'done'
                          ? 'border-success-fg bg-success-bg text-success-fg'
                          : state === 'current'
                            ? 'border-brand-500 bg-brand-50 text-brand-fg shadow-[0_3px_0_var(--brand-200)]'
                            : 'border-border bg-surface text-text-muted'
                      }`}
                    >
                      <span aria-hidden="true">{l}</span>
                    </li>
                  );
                })}
              </ol>
            )}
            <div className="flex flex-wrap items-center justify-center gap-5">
              <HoldRing progress={performing ? (live?.progress ?? 0) : run.feedback?.kind === 'correct' ? 1 : 0} label={t.holdRing}>
                <span role="img" aria-label={t.current(letter)} className="text-8xl font-black text-text">{letter}</span>
              </HoldRing>
              <ReferenceHand letter={letter} sign={signs.find((x) => x.gloss === letter)} />
            </div>
            {performing && live?.confused && <p role="status" className="rounded-full bg-warning-bg px-4 py-1.5 text-sm font-extrabold text-warning-fg">{t.nearMiss(live.confused)}</p>}
            {performing && live && live.fingers.length > 0 && (
              <ul aria-label={vi.fingers.list} className="flex flex-col gap-1 text-sm font-bold text-text-muted">
                {live.fingers.slice(0, 2).map((f) => <li key={`${f.finger}${f.joint}`}>{f.hint}</li>)}
              </ul>
            )}
            {performing && live && <div className="w-full max-w-sm"><PredictionBars items={live.topK.slice(0, 3)} caption={vi.practice.top3} /></div>}
          </Card>
        )}
        {/* The camera stays mounted while it runs, also on cards: the engine holds this very <video>, so a fresh
            element on the next sign would leave it watching a detached one and no hand would ever be seen. */}
        {(isSign || running) && (
          <div className={isSign ? 'flex flex-col gap-3' : 'sr-only'} aria-hidden={!isSign || undefined} inert={!isSign}>
            {running || camera.status === 'error' ? (
              <CameraFrame
                state={frameState} stream={camera.stream} progress={rec.progress} message={rec.error ?? camera.error?.message}
                videoRef={videoRef} canvasRef={canvasRef} onGrant={() => void camera.start()} onRetry={() => void camera.start()}
              />
            ) : (
              <Card className="flex aspect-[4/3] flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-lg font-extrabold">{t.cameraStart}</p>
                <p className="max-w-sm text-sm text-text-muted">{t.cameraWhy}</p>
                <Button size="lg" onClick={() => void camera.start()}>{t.cameraStartBtn}</Button>
              </Card>
            )}
            {isSign && (
              <div className="flex flex-wrap gap-3">
                <Button variant="ghost" onClick={() => setHideSkeleton((h) => !h)}>{hideSkeleton ? t.showSkeleton : t.hideSkeleton}</Button>
                <Button variant="secondary" disabled={!performing} onClick={skip}>{t.skip}</Button>
              </div>
            )}
          </div>
        )}
      </main>

      {run.phase === 'feedback' && run.feedback && <FeedbackBanner feedback={run.feedback} onContinue={run.advance} />}
    </div>
  );
}
