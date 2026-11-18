import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { loadActiveManifest } from '@/app/staticData';
import { Card } from '@/components/ui/Card';
import { dateKey } from '@/game/streak';
import { vi } from '@/i18n/vi';
import { useLearner } from '@/storage/useLearner';
import { buildHeatmap, type HeatDay } from './heatmap';

const LEVEL_CLASS: Record<HeatDay['level'], string> = {
  0: 'bg-surface-2', 1: 'bg-brand-200', 2: 'bg-brand-500', 3: 'bg-brand-600', 4: 'bg-brand-700',
};

/** Profile (docs/05 §5.6): XP, streaks, 12-week activity and per-letter mastery, all from the learner's own data. */
export function Profile({ labels: given, now = () => new Date() }: { labels?: string[]; now?: () => Date }) {
  const profile = useLearner((s) => s.profile);
  const stats = useLearner((s) => s.stats);
  const daily = useLearner((s) => s.daily);
  const signStats = useLearner((s) => s.signStats);
  const goal = useLearner((s) => s.settings.daily_xp_goal);
  const [fetched, setFetched] = useState<string[]>([]);
  const labels = given ?? fetched;
  const t = vi.profile;

  useEffect(() => {
    if (given) return;
    let live = true;
    loadActiveManifest('static_letters').then((m) => live && setFetched(m.labels)).catch(() => {});
    return () => { live = false; };
  }, [given]);

  const grid = useMemo(() => buildHeatmap(daily, dateKey(now(), profile.timezone), goal), [daily, profile.timezone, goal, now]);
  const activeDays = grid.flat().filter((d) => d.xp > 0).length;
  const name = profile.display_name;
  const tried = labels.filter((l) => (signStats[l]?.attempts ?? 0) > 0);

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="sr-only">{t.title}</h1>
      <div className="flex items-center gap-4">
        <div role="img" aria-label={t.avatar} className="flex size-20 items-center justify-center rounded-full bg-brand-600 text-4xl font-extrabold text-text-on-brand">
          {(name?.[0] ?? '?').toUpperCase()}
        </div>
        <div>
          <p className="text-2xl font-extrabold">{name ?? t.anonymous}</p>
          <Link to="/settings" className="font-bold text-brand-600 underline">{vi.nav.settings}</Link>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-3">
        {([[t.xp, String(stats.total_xp)], [t.streak, t.days(stats.current_streak)], [t.longest, t.days(stats.longest_streak)]] as const).map(([k, v]) => (
          <Card key={k} className="text-center">
            <dt className="text-sm text-text-muted">{k}</dt>
            <dd className="text-2xl font-extrabold">{v}</dd>
          </Card>
        ))}
      </dl>

      <Card>
        <h2 className="font-extrabold">{t.heatmap}</h2>
        <div role="img" aria-label={t.heatmapLabel} className="mt-3 flex gap-1 overflow-x-auto">
          {grid.map((week) => (
            <div key={week[0].date} className="flex flex-col gap-1">
              {week.map((d) => (
                <div
                  key={d.date} title={t.day(d.date, d.xp)} data-level={d.level}
                  className={`size-4 rounded-sm ${d.future ? 'opacity-20' : ''} ${LEVEL_CLASS[d.level]}`}
                />
              ))}
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm text-text-muted">{t.activeDays(activeDays)}</p>
      </Card>

      <Card>
        <h2 className="font-extrabold">{t.mastery}</h2>
        {tried.length === 0 ? <p className="mt-2 text-text-muted">{t.masteryEmpty}</p> : (
          <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {labels.map((l) => {
              const s = signStats[l];
              const pct = s && s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : null;
              return (
                <li
                  key={l} aria-label={pct === null ? `${l}: ${t.notTried}` : t.masteryItem(l, pct, s.attempts)}
                  className="flex flex-col items-center rounded-[var(--radius-xl)] border-2 border-border p-2"
                >
                  <span className="text-xl font-extrabold" aria-hidden="true">{l}</span>
                  <span className="text-sm text-text-muted" aria-hidden="true">{pct === null ? '—' : `${pct}%`}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
