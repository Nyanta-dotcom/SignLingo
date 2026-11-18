import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { vi } from '@/i18n/vi';
import { ms, pct, rowLabel } from './format';
import { benchmarkRows, bestBaseline, type Run } from './selectors';

/** Benchmark tab (docs/05 §5.5): table plus a Test Macro-F1 bar chart with the best baseline as a dashed line. */
export function Benchmark({ runs, datasets }: { runs: Run[]; datasets: string[] }) {
  const [dataset, setDataset] = useState(datasets.includes('sign_mnist') ? 'sign_mnist' : (datasets[0] ?? ''));
  const rows = benchmarkRows(runs, dataset);
  const base = bestBaseline(rows);
  const top = rows.filter((r) => r.kind === 'main').reduce<string | null>((id, r) => (!id || (r.test_f1?.mean ?? 0) > (rows.find((x) => x.id === id)?.test_f1?.mean ?? 0) ? r.id : id), null);
  const t = vi.lab.bench;

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-wrap items-center gap-3 font-bold">
        {vi.lab.dataset}
        <select
          value={dataset} onChange={(e) => setDataset(e.target.value)}
          className="min-h-11 rounded-[var(--radius-xl)] border-2 border-border bg-surface px-3"
        >
          {datasets.map((d) => <option key={d} value={d}>{vi.lab.datasets[d] ?? d}</option>)}
        </select>
      </label>
      {rows.length === 0 ? <p>{t.none}</p> : (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="pb-2 text-left font-extrabold">{t.caption}</caption>
              <thead>
                <tr className="text-text-muted">
                  {[t.model, t.features, t.split, t.seeds, t.valF1, t.testAcc, t.testF1, t.err, t.latency].map((h) => <th key={h} scope="col" className="py-1 pr-3">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <th scope="row" className="py-2 pr-3 font-bold">
                      {rowLabel(r, rows)}{r.id === top && <span className="ml-2 rounded-full bg-success-bg px-2 py-0.5 text-xs text-success-fg">★ {t.best}</span>}
                    </th>
                    <td className="pr-3">{r.feature_set}</td>
                    <td className="pr-3">{vi.lab.splits[r.split_strategy] ?? r.split_strategy}</td>
                    <td className="pr-3">{r.test_f1?.n ?? 0}</td>
                    <td className="pr-3">{pct(r.val_f1)}</td>
                    <td className="pr-3">{pct(r.test_acc)}</td>
                    <td className="pr-3 font-bold">{pct(r.test_f1)}</td>
                    <td className="pr-3">{pct(r.error_rate)}</td>
                    <td>{ms(r.latency_ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card>
            <h2 className="font-extrabold">{t.chartTitle}</h2>
            <div role="img" aria-label={t.chartLabel} className="relative mt-3 flex flex-col gap-2">
              {rows.map((r) => (
                <div key={r.id} className="grid grid-cols-[12rem_1fr_4rem] items-center gap-2 text-sm">
                  <span className="truncate font-bold" title={rowLabel(r, rows)}>{rowLabel(r, rows)}</span>
                  <div className="h-4 rounded-full bg-surface-2">
                    <div className={`h-4 rounded-full ${r.kind === 'main' ? 'bg-brand-500' : 'bg-text-muted'}`} style={{ width: `${(r.test_f1?.mean ?? 0) * 100}%` }} />
                  </div>
                  <span className="text-right">{pct(r.test_f1, 1).split(' ')[0]}</span>
                </div>
              ))}
              {base?.test_f1 && (
                <div
                  aria-hidden="true" data-testid="baseline-line"
                  className="pointer-events-none absolute inset-y-0 border-l-2 border-dashed border-warning-fg"
                  style={{ left: `calc(12.5rem + (100% - 17rem) * ${base.test_f1.mean})` }}
                />
              )}
            </div>
            {base && <p className="mt-3 text-sm text-text-muted">{t.baselineLine(base.model_name, pct(base.test_f1))}</p>}
          </Card>
        </>
      )}
    </div>
  );
}
