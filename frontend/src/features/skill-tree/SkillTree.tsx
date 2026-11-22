import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { loadActiveManifest } from '@/app/staticData';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BoltIcon, LabIcon, PlayIcon } from '@/components/ui/Icons';
import { ProgressBar } from '@/components/ui/ProgressBar';
import curriculumJson from '@/content/curriculum.json';
import { loadCurriculum } from '@/content/loader';
import type { Curriculum } from '@/content/types';
import { dateKey } from '@/game/streak';
import { lessonStatus } from '@/game/unlock';
import { vi } from '@/i18n/vi';
import { useLearner } from '@/storage/useLearner';
import { SkillNode } from './SkillNode';

export type LearnData = { curriculum: Curriculum; model: { model_id: string; version: string } };

export async function loadLearnData(): Promise<LearnData> {
  const manifest = await loadActiveManifest('static_letters');
  return { curriculum: loadCurriculum(curriculumJson, manifest.labels), model: { model_id: manifest.model_id, version: manifest.version } };
}

const ZIGZAG = [0, 1, 2, 1, 0, -1, -2, -1];
const STEP_PX = 34;

/** Learning path: Duolingo-style units with zig-zag rose-pink lesson nodes and daily goal sidebar. */
export function SkillTree({ load = loadLearnData, now = () => new Date() }: { load?: () => Promise<LearnData>; now?: () => Date }) {
  const progress = useLearner((s) => s.progress);
  const daily = useLearner((s) => s.daily);
  const goal = useLearner((s) => s.settings.daily_xp_goal);
  const tz = useLearner((s) => s.profile.timezone);
  const [data, setData] = useState<LearnData | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const t = vi.learn;

  useEffect(() => {
    let live = true;
    load().then((d) => live && setData(d)).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [load]);

  const today = daily[dateKey(now(), tz)]?.xp_earned ?? 0;
  const units = useMemo(() => [...(data?.curriculum.units ?? [])].sort((a, b) => a.order - b.order), [data]);

  return (
    <section className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_19rem]">
      <div className="flex flex-col gap-10">
        <h1 className="sr-only">{t.title}</h1>
        {failed && <p role="alert" className="rounded-2xl bg-danger-bg p-4 font-bold text-danger-on-bg">{t.loadError}</p>}
        {!data && !failed && <p className="text-text-muted">{t.loading}</p>}
        {units.map((unit) => (
          <section key={unit.code} aria-labelledby={`unit-${unit.code}`} className="flex flex-col items-center gap-6">
            <div className="unit-banner flex w-full flex-col gap-1.5 rounded-3xl px-6 py-5 text-ink-on-pink">
              <p className="w-fit rounded-full bg-surface/75 px-3 py-0.5 text-xs font-extrabold uppercase tracking-widest text-ink-on-pink">
                {t.level(unit.level)}
              </p>
              <h2 id={`unit-${unit.code}`} className="text-2xl font-black tracking-tight">{unit.title}</h2>
            </div>
            <ol className="flex w-full flex-col items-center gap-5 py-1">
              {[...unit.lessons].sort((a, b) => a.order - b.order).map((lesson, i) => {
                const status = lessonStatus(lesson, progress);
                const expanded = open === lesson.code;
                return (
                  <li key={lesson.code} className="flex flex-col items-center gap-2.5" style={{ transform: `translateX(${ZIGZAG[i % ZIGZAG.length] * STEP_PX}px)` }}>
                    <SkillNode title={lesson.title} status={status} expanded={expanded} onSelect={() => setOpen(expanded ? null : lesson.code)} />
                    <span className={`text-xs font-extrabold ${status === 'locked' ? 'text-text-muted' : 'text-text'}`}>
                      {lesson.title}
                    </span>
                    {expanded && (
                      <Card
                        role="group"
                        aria-label={t.popover(lesson.title)}
                        onKeyDown={(e) => e.key === 'Escape' && setOpen(null)}
                        className="flex w-72 flex-col items-center gap-3 border-brand-200 text-center shadow-(--card-shadow-hover)"
                      >
                        <p className="text-lg font-black text-text">{lesson.title}</p>
                        {status === 'locked' ? (
                          <p className="text-sm text-text-muted">{t.lockedHint}</p>
                        ) : (
                          <>
                            <p className="rounded-full bg-brand-50 px-3.5 py-1 text-xs font-extrabold text-brand-fg">
                              {t.items(lesson.items.length)} · {t.xp(lesson.xp_reward)}
                            </p>
                            <Button asChild className="w-full">
                              <Link to={`/lesson/${lesson.code}`}>
                                <PlayIcon className="size-4" />
                                {status === 'completed' ? t.again : t.start}
                              </Link>
                            </Button>
                          </>
                        )}
                      </Card>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

      <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-text">{t.goal}</h2>
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-warning-bg/70 text-xp">
              <BoltIcon className="size-4" />
            </span>
          </div>
          <ProgressBar value={today} max={goal} label={t.goal} />
          <p className="text-sm font-extrabold text-text-muted">{t.goalValue(today, goal)}</p>
        </Card>
        {data && (
          <Card className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-brand-fg">
              <LabIcon className="size-4" />
              <p className="text-xs font-extrabold uppercase tracking-wider">{t.aiUsing}</p>
            </div>
            <p className="text-base font-black text-text">{data.model.model_id} {data.model.version}</p>
            <Link to="/lab" className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-brand-50 px-3.5 py-1.5 text-sm font-extrabold text-brand-fg transition-colors hover:bg-brand-100">
              {t.seeLab} →
            </Link>
          </Card>
        )}
      </aside>
    </section>
  );
}
