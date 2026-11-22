import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { loadActiveManifest } from '@/app/staticData';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { vi } from '@/i18n/vi';
import type { LeaderboardApi, LeaderboardRow } from '@/sync/supabase';
import { useAccount } from '@/sync/useAccount';
import { useLeaderboardApi } from '@/sync/useLeaderboardApi';

type Tab = 'week' | 'total' | 'streak' | 'accuracy';
const TABS: readonly Tab[] = ['week', 'total', 'streak', 'accuracy'];

type Load = { state: 'loading' } | { state: 'error' } | { state: 'ready'; rows: LeaderboardRow[] };

/** Ranking of the people who chose to join. Visible to signed-in people only; the server enforces that. */
export function Leaderboard({ api: given, labels: givenLabels }: { api?: LeaderboardApi | null; labels?: string[] }) {
  const t = vi.leaderboard;
  const status = useAccount((s) => s.status);
  const hookApi = useLeaderboardApi();
  const api = given === undefined ? hookApi : given;
  const [tab, setTab] = useState<Tab>('week');
  const [letter, setLetter] = useState('');
  const [fetched, setFetched] = useState<string[]>([]);
  const [load, setLoad] = useState<Load>({ state: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const labels = givenLabels ?? fetched;

  useEffect(() => {
    if (givenLabels) return;
    let live = true;
    loadActiveManifest('static_letters').then((m) => live && setFetched(m.labels)).catch(() => {});
    return () => { live = false; };
  }, [givenLabels]);

  const byLetter = tab === 'accuracy' && letter !== '';
  useEffect(() => {
    if (!api) return;
    let live = true;
    setLoad({ state: 'loading' });
    api.top(byLetter ? 'letter' : tab, byLetter ? letter : undefined)
      .then((rows) => live && setLoad({ state: 'ready', rows }))
      .catch(() => live && setLoad({ state: 'error' }));
    return () => { live = false; };
  }, [api, tab, letter, byLetter, attempt]);

  const formatScore = t.score[tab];

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-5">
      <h1 className="text-3xl font-extrabold">{t.title}</h1>

      {!api ? (
        <Card className="flex flex-col items-start gap-3">
          <p className="text-text-muted">{status === 'disabled' ? t.disabled : status === 'loading' ? vi.common.loading : t.signedOut}</p>
          {status === 'signed_out' && <Button asChild><Link to="/profile">{t.toProfile}</Link></Button>}
        </Card>
      ) : (
        <>
          <div role="tablist" aria-label={t.title} className="flex flex-wrap gap-2">
            {TABS.map((k) => (
              <Button key={k} role="tab" size="sm" variant={tab === k ? 'primary' : 'secondary'} aria-selected={tab === k} onClick={() => setTab(k)}>{t.tabs[k]}</Button>
            ))}
          </div>

          {tab === 'accuracy' && (
            <label className="flex max-w-xs flex-col gap-1 text-sm font-bold">
              {t.letterLabel}
              <select value={letter} onChange={(e) => setLetter(e.target.value)} className="min-h-11 rounded-xl border-2 border-border bg-surface px-3 text-text">
                <option value="">{t.allLetters}</option>
                {labels.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
          )}
          <p className="text-sm text-text-muted">{t.notes[tab]}</p>

          <Card>
            {load.state === 'loading' && <p role="status" className="text-text-muted">{t.loading}</p>}
            {load.state === 'error' && (
              <div className="flex flex-col items-start gap-3">
                <p role="alert" className="font-bold text-danger-on-bg">{t.failed}</p>
                <Button variant="secondary" size="sm" onClick={() => setAttempt((n) => n + 1)}>{t.retry}</Button>
              </div>
            )}
            {load.state === 'ready' && load.rows.length === 0 && <p className="text-text-muted">{t.empty}</p>}
            {load.state === 'ready' && load.rows.length > 0 && (
              <ol className="flex flex-col gap-2">
                {load.rows.map((r) => (
                  <li key={`${r.rank}-${r.name}-${r.me}`} className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-2.5 ${r.me ? 'border-brand-300 bg-brand-50' : 'border-transparent bg-surface-2'}`}>
                    <span className="w-8 text-center text-lg font-black text-brand-fg">{r.rank}</span>
                    <span className="flex-1 truncate font-extrabold text-text">
                      {r.name}{r.me && <span className="ml-2 rounded-full bg-brand-200 px-2 py-0.5 text-xs font-black text-brand-fg">{t.you}</span>}
                    </span>
                    <span className="text-right font-black text-text">
                      {formatScore(r.score)}
                      {r.detail !== null && <span className="block text-xs font-bold text-text-muted">{t.attempts(r.detail)}</span>}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
    </section>
  );
}
