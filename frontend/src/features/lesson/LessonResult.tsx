import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { MIN_LESSON_ACCURACY, missedLetters } from '@/game/lessonFlow';
import { vi } from '@/i18n/vi';
import { useLearner } from '@/storage/useLearner';
import type { Result } from './useLessonRun';

const PIECES = Array.from({ length: 24 }, (_, i) => i);
const COLORS = ['bg-brand-500', 'bg-success-fg', 'bg-warning-fg', 'bg-sky-400'];

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

/** Lesson summary (docs/05 §5.3): XP, accuracy, time, streak and the letters worth another go. */
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
      <section aria-labelledby="done-title" className="mx-auto flex max-w-xl flex-col items-center gap-6 py-8 text-center">
        <h1 id="done-title" className="text-3xl font-extrabold">{t.notPassed}</h1>
        <p className="text-lg">{t.notPassedText(MIN_LESSON_ACCURACY * 100, result.record.accuracy_pct ?? 0)}</p>
        {missed.length > 0 && (
          <Card className="w-full">
            <h2 className="font-extrabold">{t.missed}</h2>
            <ul className="mt-2 flex flex-wrap justify-center gap-2">
              {missed.map((m) => <li key={m.letter} className="rounded-full bg-surface-2 px-3 py-1 font-bold">{t.missedItem(m.letter, m.misses)}</li>)}
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
    <section aria-labelledby="done-title" className="relative mx-auto flex max-w-xl flex-col items-center gap-6 py-8 text-center">
      {!still && (
        <div aria-hidden="true" data-testid="confetti" className="pointer-events-none absolute inset-x-0 top-0 h-40 overflow-hidden">
          {PIECES.map((i) => (
            <span key={i} className={`confetti-piece absolute top-0 size-2 rounded-sm ${COLORS[i % COLORS.length]}`} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 8) * 90}ms` }} />
          ))}
        </div>
      )}
      <h1 id="done-title" className="text-3xl font-extrabold">{t.done}</h1>
      <dl className="grid w-full grid-cols-3 gap-3">
        <Card><dt className="text-sm text-text-muted">{t.xp}</dt><dd className="text-2xl font-extrabold" aria-label={String(xp)}>{shown}</dd></Card>
        <Card><dt className="text-sm text-text-muted">{t.accuracy}</dt><dd className="text-2xl font-extrabold">{result?.record.accuracy_pct ?? 0}%</dd></Card>
        <Card><dt className="text-sm text-text-muted">{t.time}</dt><dd className="text-2xl font-extrabold">{t.seconds(seconds)}</dd></Card>
      </dl>
      {result && streakNow > result.streakFrom && <p className="font-bold" data-testid="streak">{t.streak(result.streakFrom, streakNow)}</p>}
      {missed.length > 0 && (
        <Card className="w-full">
          <h2 className="font-extrabold">{t.missed}</h2>
          <ul className="mt-2 flex flex-wrap justify-center gap-2">
            {missed.map((m) => <li key={m.letter} className="rounded-full bg-surface-2 px-3 py-1 font-bold">{t.missedItem(m.letter, m.misses)}</li>)}
          </ul>
          <div className="mt-3"><Button variant="secondary" onClick={onRetry}>{t.retry}</Button></div>
        </Card>
      )}
      <Button size="lg" onClick={onFinish}>{t.finish}</Button>
    </section>
  );
}
