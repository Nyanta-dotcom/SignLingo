import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { vi } from '@/i18n/vi';
import { cleanDisplayName } from '@/sync/leaderboardName';
import type { LeaderboardApi } from '@/sync/supabase';
import { accountStore } from '@/sync/useAccount';
import { useLeaderboardApi } from '@/sync/useLeaderboardApi';

const INPUT = 'min-h-11 w-full rounded-xl border-2 border-border bg-surface px-3 text-text focus-visible:border-brand-500';

type Notice = { text: string; bad: boolean } | null;

/** Opt-in to the leaderboard. Shown only when signed in; nothing is shared until the person presses Join. */
export function JoinCard({ api: given, beforeJoin = () => accountStore().getState().syncNow() }: { api?: LeaderboardApi | null; beforeJoin?: () => Promise<void> }) {
  const t = vi.leaderboard.join;
  const hookApi = useLeaderboardApi();
  const api = given === undefined ? hookApi : given;
  const [name, setName] = useState('');
  const [joinedAs, setJoinedAs] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  useEffect(() => {
    if (!api) return;
    let live = true;
    api.loadMine().then((mine) => {
      if (!live || !mine) return;
      setName(mine.display_name);
      setJoinedAs(mine.show_on_leaderboard ? mine.display_name : null);
    }).catch(() => {});
    return () => { live = false; };
  }, [api]);

  if (!api) return null;

  const run = async (work: () => Promise<void>, done: () => Notice) => {
    setBusy(true);
    setNotice(null);
    try { await work(); setNotice(done()); } catch { setNotice({ text: t.failed, bad: true }); } finally { setBusy(false); }
  };

  const join = (e: FormEvent) => {
    e.preventDefault();
    const clean = cleanDisplayName(name);
    if (!clean) { setNotice({ text: t.nameBad, bad: true }); return; }
    // Sync first so the scores shown are the latest ones, not the last time this device synced.
    void run(async () => { await beforeJoin(); await api.join(clean); setName(clean); setJoinedAs(clean); }, () => ({ text: t.joined(clean), bad: false }));
  };
  const leave = () => void run(async () => { await api.leave(); setJoinedAs(null); }, () => ({ text: t.left, bad: false }));

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-black text-text">{t.title}</h2>
      <p className="text-sm text-text-muted">{t.intro}</p>
      <form onSubmit={join} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="leaderboard-name" className="text-sm font-bold">{t.nameLabel}</label>
          <input id="leaderboard-name" value={name} maxLength={40} autoComplete="nickname" onChange={(e) => setName(e.target.value)} className={INPUT} />
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>{joinedAs ? t.saveName : t.joinNow}</Button>
          {joinedAs && <Button variant="secondary" disabled={busy} onClick={leave}>{t.leave}</Button>}
          {joinedAs && <Button variant="ghost" asChild><Link to="/leaderboard">{t.seeBoard}</Link></Button>}
        </div>
      </form>
      {joinedAs && !notice && <p role="status" className="text-sm font-bold text-success-fg">{t.joined(joinedAs)}</p>}
      {notice && <p role="status" className={`text-sm font-bold ${notice.bad ? 'text-danger-on-bg' : 'text-success-fg'}`}>{notice.text}</p>}
    </Card>
  );
}
