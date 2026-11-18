import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { loadActiveManifest } from '@/app/staticData';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
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

async function loadLearnData(): Promise<LearnData> {
  const manifest = await loadActiveManifest('static_letters');
  return { curriculum: loadCurriculum(curriculumJson, manifest.labels), model: { model_id: manifest.model_id, version: manifest.version } };
}

const ZIGZAG = [0, 1, 2, 1, 0, -1, -2, -1];
const STEP_PX = 36;

/** Learning path (docs/05 §5.1): units with zig-zag lesson nodes whose state is derived from `requires` and progress. */
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
    <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_18rem]">
      <div className="flex flex-col gap-8">
        <h1 className="sr-only">{t.title}</h1>
        {failed && <p role="alert" className="font-bold text-danger-on-bg">{t.loadError}</p>}
        {!data && !failed && <p>{t.loading}</p>}
        {units.map((unit) => (
          <section key={unit.code} aria-labelledby={`unit-${unit.code}`} className="flex flex-col items-center gap-4">
            <div className="w-full rounded-[var(--radius-2xl)] bg-brand-600 p-4 text-text-on-brand">
              <p className="text-sm font-bold uppercase">{t.level(unit.level)}</p>
              <h2 id={`unit-${unit.code}`} className="text-xl font-extrabold">{unit.title}</h2>
            </div>
            <ol className="flex w-full flex-col items-center gap-4">
              {[...unit.lessons].sort((a, b) => a.order - b.order).map((lesson, i) => {
                const status = lessonStatus(lesson, progress);
                const expanded = open === lesson.code;
                return (
                  <li key={lesson.code} className="flex flex-col items-center gap-2" style={{ transform: `translateX(${ZIGZAG[i % ZIGZAG.length] * STEP_PX}px)` }}>
                    <SkillNode title={lesson.title} status={status} expanded={expanded} onSelect={() => setOpen(expanded ? null : lesson.code)} />
                    {expanded && (
                      <Card role="group" aria-label={t.popover(lesson.title)} onKeyDown={(e) => e.key === 'Escape' && setOpen(null)} className="flex w-64 flex-col items-center gap-2 text-center">
                        <p className="font-extrabold">{lesson.title}</p>
                        {status === 'locked' ? <p className="text-sm text-text-muted">{t.lockedHint}</p> : (
                          <>
                            <p className="text-sm text-text-muted">{t.items(lesson.items.length)} · {t.xp(lesson.xp_reward)}</p>
                            <Button asChild><Link to={`/lesson/${lesson.code}`}>{status === 'completed' ? t.again : t.start}</Link></Button>
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

      <aside className="flex flex-col gap-4">
        <Card>
          <h2 className="font-extrabold">{t.goal}</h2>
          <ProgressBar value={today} max={goal} label={t.goal} className="mt-2" />
          <p className="mt-1 text-sm text-text-muted">{t.goalValue(today, goal)}</p>
        </Card>
        {data && (
          <Card>
            <p className="text-sm text-text-muted">{t.aiUsing}</p>
            <p className="font-extrabold">{data.model.model_id} {data.model.version}</p>
            <Link to="/lab" className="text-sm font-bold text-brand-fg underline">{t.seeLab}</Link>
          </Card>
        )}
      </aside>
    </section>
  );
}
