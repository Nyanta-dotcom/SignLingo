import { Card } from '@/components/ui/Card';
import { vi } from '@/i18n/vi';
import { pct } from './format';
import { leakageSummary, type LeakageRun } from './selectors';

/** Data Leakage tab: validation vs test accuracy for a random split and a group split (kind = leakage_study). */
export function Leakage({ runs }: { runs: LeakageRun[] }) {
  const groups = leakageSummary(runs);
  const t = vi.lab.leak;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-xl font-extrabold">{t.title}</h2>
      <p className="text-text-muted">{t.intro}</p>
      <Card>
        <div role="img" aria-label={t.chartLabel} className="flex flex-col gap-4">
          {groups.map((g) => (
            <div key={g.split}>
              <p className="font-bold">{vi.lab.splits[g.split] ?? g.split}</p>
              {([['Val', g.val_acc, 'bg-brand-500'], ['Test', g.test_acc, 'bg-text-muted']] as const).map(([name, s, color]) => (
                <div key={name} className="mt-1 grid grid-cols-[3rem_1fr_6rem] items-center gap-2 text-sm">
                  <span>{name}</span>
                  <div className="h-4 rounded-full bg-surface-2"><div className={`h-4 rounded-full ${color}`} style={{ width: `${s.mean * 100}%` }} /></div>
                  <span className="text-right">{pct(s)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <caption className="pb-2 text-left font-extrabold">{t.caption}</caption>
          <thead>
            <tr className="text-text-muted">
              {[t.split, t.val, t.test, t.gap, t.dist].map((h) => <th key={h} scope="col" className="py-1 pr-3">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.split} className="border-t border-border">
                <th scope="row" className="py-2 pr-3 font-bold">{vi.lab.splits[g.split] ?? g.split}</th>
                <td className="pr-3">{pct(g.val_acc)}</td>
                <td className="pr-3">{pct(g.test_acc)}</td>
                <td className="pr-3 font-bold">{pct(g.gap)}</td>
                <td>{g.nn_dist ? g.nn_dist.mean.toFixed(2) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
