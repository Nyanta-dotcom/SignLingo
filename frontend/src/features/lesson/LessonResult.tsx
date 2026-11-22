import { useEffect, useState, type CSSProperties } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BoltIcon, FlameIcon, SparkleIcon, StarIcon } from '@/components/ui/Icons';
import { MIN_LESSON_ACCURACY, missedLetters } from '@/game/lessonFlow';
import { vi } from '@/i18n/vi';
import { useLearner } from '@/storage/useLearner';
import type { Result } from './useLessonRun';

const PIECES = Array.from({ length: 36 }, (_, i) => i);
const COLORS = ['bg-brand-500', 'bg-brand-300', 'bg-brand-600', 'bg-xp', 'bg-success-fg', 'bg-streak'];
const SHAPES = ['size-2.5 rounded-full', 'h-3.5 w-2 rounded-sm', 'size-2.5 rotate-45 rounded-xs'];
const SPARKLES = [
  { sx: '-64px', sy: '-36px', delay: '120ms', color: 'text-brand-500' },
  { sx: '66px', sy: '-34px', delay: '160ms', color: 'text-xp' },
  { sx: '-72px', sy: '18px', delay: '220ms', color: 'text-xp' },
  { sx: '72px', sy: '20px', delay: '260ms', color: 'text-brand-400' },
  { sx: '-36px', sy: '-68px', delay: '190ms', color: 'text-brand-300' },
  { sx: '38px', sy: '-66px', delay: '240ms', color: 'text-success-fg' },
] as const;

/** XP counts up unless the person asked for less motion (setting or system). */
function useCountUp(target: number, still: boolean): number {
  const [value, setValue] = useState(still ? target : 0);
  useEffect(() => {
    if (still || target === 0) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let id = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 900);
      setValue(Math.round(target * t));
      if (t < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target, still]);
  return value;
}

/** Lesson summary: Duolingo-style celebration animation, XP count-up, accuracy, time, streak and review list. */
export function LessonResult({ result, onFinish, onRetry }: { result: Result | null; onFinish: () => void; onRetry: () => void }) {
  const reduced = useLearner((s) => s.settings.reduced_motion);
  const streakNow = useLearner((s) => s.stats.current_streak);
  const still = reduced === 'on' || (reduced === 'system' && (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false));
  const xp = result?.record.xp_awarded ?? 0;
  const shown = useCountUp(xp, still);
  const t = vi.lesson;
  const seconds = result?.record.completed_at ? Math.max(0, Math.round((Date.parse(result.record.completed_at) - Date.parse(result.record.started_at)) / 1000)) : 0;
  const missed = result ? missedLetters(result.record.attempts) : [];
  const passed = !result || result.record.status === 'completed';

  if (!passed && result) {
    return (
      <section aria-labelledby="done-title" className="mx-auto flex max-w-xl flex-col items-center gap-6 px-4 py-12 text-center">
        <h1 id="done-title" className="text-3xl font-black">{t.notPassed}</h1>
        <p className="text-lg text-text-muted">{t.notPassedText(MIN_LESSON_ACCURACY * 100, result.record.accuracy_pct ?? 0)}</p>
        {missed.length > 0 && (
          <Card className="w-full">
            <h2 className="font-extrabold">{t.missed}</h2>
            <ul className="mt-3 flex flex-wrap justify-center gap-2">
              {missed.map((m) => <li key={m.letter} className="rounded-full bg-brand-50 px-3.5 py-1 text-sm font-extrabold text-brand-fg">{t.missedItem(m.letter, m.misses)}</li>)}
            </ul>
          </Card>
        )}
        <div className="flex gap-3">
          <Button size="lg" onClick={onRetry}>{t.tryAgain}</Button>
          <Button size="lg" variant="secondary" onClick={onFinish}>{t.backToPath}</Button>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="done-title" className="relative mx-auto flex max-w-xl flex-col items-center gap-6 overflow-hidden px-4 py-12 text-center">
      {!still && (
        <div aria-hidden="true" data-testid="confetti" className="pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden">
          {PIECES.map((i) => (
            <span
              key={i}
              className={`confetti-piece absolute top-0 ${SHAPES[i % SHAPES.length]} ${COLORS[i % COLORS.length]}`}
              style={{
                left: `${(i * 29 + 5) % 96}%`,
                animationDelay: `${(i % 9) * 85}ms`,
                '--drift': `${((i % 7) - 3) * 18}px`,
              } as CSSProperties}
            />
          ))}
        </div>
      )}

      <div className="relative flex size-28 items-center justify-center">
        {!still && (
          <>
            <span aria-hidden="true" className="celebrate-ring pointer-events-none absolute inset-3 rounded-full border-4 border-brand-300" />
            <span aria-hidden="true" className="celebrate-ring pointer-events-none absolute inset-3 rounded-full border-4 border-brand-200" style={{ animationDelay: '220ms' }} />
            {SPARKLES.map((s, i) => (
              <SparkleIcon
                key={i}
                className={`celebrate-sparkle pointer-events-none absolute size-5 ${s.color}`}
                style={{ animationDelay: s.delay, '--sx': s.sx, '--sy': s.sy } as CSSProperties}
              />
            ))}
          </>
        )}
        <span className={`btn-pink relative inline-flex size-20 items-center justify-center rounded-full text-ink-on-pink ${still ? '' : 'celebrate-badge'}`}>
          <StarIcon className="size-10" />
        </span>
      </div>

      <h1 id="done-title" className={`text-3xl font-black tracking-tight text-text sm:text-4xl ${still ? '' : 'celebrate-card'}`} style={{ animationDelay: '100ms' }}>
        {t.done}
      </h1>

      <dl className="grid w-full grid-cols-3 gap-3.5">
        <Card className={`p-4 ${still ? '' : 'celebrate-card'}`} style={{ animationDelay: '160ms' }}>
          <dt className="flex items-center justify-center gap-1 text-xs font-extrabold uppercase tracking-wider text-text-muted">
            <BoltIcon className="size-3.5 text-xp" />
            {t.xp}
          </dt>
          <dd className="mt-1 text-2xl font-black tabular-nums text-brand-fg" aria-label={String(xp)}>{shown}</dd>
        </Card>
        <Card className={`p-4 ${still ? '' : 'celebrate-card'}`} style={{ animationDelay: '250ms' }}>
          <dt className="text-xs font-extrabold uppercase tracking-wider text-text-muted">{t.accuracy}</dt>
          <dd className="mt-1 text-2xl font-black tabular-nums text-success-fg">{result?.record.accuracy_pct ?? 0}%</dd>
        </Card>
        <Card className={`p-4 ${still ? '' : 'celebrate-card'}`} style={{ animationDelay: '340ms' }}>
          <dt className="text-xs font-extrabold uppercase tracking-wider text-text-muted">{t.time}</dt>
          <dd className="mt-1 text-2xl font-black tabular-nums text-text">{t.seconds(seconds)}</dd>
        </Card>
      </dl>

      {result && streakNow > result.streakFrom && (
        <p
          className={`inline-flex items-center gap-1.5 rounded-full border-2 border-warning-fg/25 bg-warning-bg px-4 py-1.5 text-sm font-extrabold text-warning-fg ${still ? '' : 'celebrate-card'}`}
          style={{ animationDelay: '400ms' }}
          data-testid="streak"
        >
          <FlameIcon className="size-4 text-streak" />
          {t.streak(result.streakFrom, streakNow)}
        </p>
      )}

      {missed.length > 0 && (
        <Card className="w-full">
          <h2 className="font-extrabold">{t.missed}</h2>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {missed.map((m) => <li key={m.letter} className="rounded-full bg-brand-50 px-3.5 py-1 text-sm font-extrabold text-brand-fg">{t.missedItem(m.letter, m.misses)}</li>)}
          </ul>
          <div className="mt-4"><Button variant="secondary" onClick={onRetry}>{t.retry}</Button></div>
        </Card>
      )}

      <Button size="lg" onClick={onFinish}>{t.finish}</Button>
    </section>
  );
}
