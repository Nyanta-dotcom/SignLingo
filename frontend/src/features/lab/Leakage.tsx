import { Card } from '@/components/ui/Card';
import { vi } from '@/i18n/vi';
import { pct } from './format';
import { leakageSummary, type LeakageRun } from './selectors';

/** Data Leakage tab: validation vs test accuracy for a random split and a group split. */
export function Leakage({ runs }: { runs: LeakageRun[] }) {
  const groups = leakageSummary(runs);
  const t = vi.lab.leak;
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-black text-text">{t.title}</h2>
        <p className="mt-1 text-text-muted">{t.intro}</p>
      </div>
      <Card>
        <div role="img" aria-label={t.chartLabel} className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.split}>
              <p className="font-extrabold">{vi.lab.splits[g.split] ?? g.split}</p>
              {([['Val', g.val_acc, 'progress-fill'], ['Test', g.test_acc, 'bg-brand-200']] as const).map(([name, s, color]) => (
                <div key={name} className="mt-1.5 grid grid-cols-[3rem_1fr_6rem] items-center gap-2 text-sm">
                  <span className="font-bold text-text-muted">{name}</span>
                  <div className="h-4 overflow-hidden rounded-full bg-surface-2"><div className={`h-4 rounded-full ${color}`} style={{ width: `${s.mean * 100}%` }} /></div>
                  <span className="text-right font-extrabold tabular-nums">{pct(s)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <caption className="pb-3 text-left text-base font-black">{t.caption}</caption>
          <thead>
            <tr className="text-xs uppercase tracking-wider text-text-muted">
              {[t.split, t.val, t.test, t.gap, t.dist].map((h) => <th key={h} scope="col" className="py-2 pr-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.split} className="border-t border-border hover:bg-brand-50/50">
                <th scope="row" className="py-2.5 pr-3 font-extrabold">{vi.lab.splits[g.split] ?? g.split}</th>
                <td className="pr-3 tabular-nums">{pct(g.val_acc)}</td>
                <td className="pr-3 tabular-nums">{pct(g.test_acc)}</td>
                <td className="pr-3 font-extrabold tabular-nums text-brand-fg">{pct(g.gap)}</td>
                <td className="tabular-nums">{g.nn_dist ? g.nn_dist.mean.toFixed(2) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
