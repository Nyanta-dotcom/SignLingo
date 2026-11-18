import { useEffect, useState } from 'react';
import { loadExperimentRun, type ExperimentRun } from '@/app/staticData';
import { Card } from '@/components/ui/Card';
import { vi } from '@/i18n/vi';
import { ConfusionMatrix } from './ConfusionMatrix';
import { inspectableRuns, weakestFirst, type Run } from './selectors';

/** Error-analysis tab (docs/05 §5.5): pick a model, see its confusion matrix, worst pairs and per-letter F1. */
export function ErrorAnalysis({ runs, datasets, loadRun = loadExperimentRun }: {
  runs: Run[]; datasets: string[]; loadRun?: (id: string) => Promise<ExperimentRun>;
}) {
  const [dataset, setDataset] = useState(datasets.includes('sign_mnist') ? 'sign_mnist' : (datasets[0] ?? ''));
  const options = inspectableRuns(runs, dataset);
  const [chosen, setChosen] = useState<string | null>(null);
  const runId = options.some((o) => o.run_id === chosen) ? chosen : (options[0]?.run_id ?? null);
  const [loaded, setLoaded] = useState<{ id: string; run?: ExperimentRun; failed?: boolean } | null>(null);
  const t = vi.lab.errors;

  useEffect(() => {
    if (!runId) return;
    let live = true;
    Promise.resolve()
      .then(() => loadRun(runId))
      .then((run) => live && setLoaded({ id: runId, run }))
      .catch(() => live && setLoaded({ id: runId, failed: true }));
    return () => { live = false; };
  }, [runId, loadRun]);

  const cur = loaded?.id === runId ? loaded : null;
  const cm = cur?.run?.confusion_matrix;
  const f1 = cur?.run?.per_class_f1 ? weakestFirst(cur.run.per_class_f1) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-3 font-bold">
          {vi.lab.dataset}
          <select value={dataset} onChange={(e) => { setDataset(e.target.value); setChosen(null); }} className="min-h-11 rounded-[var(--radius-xl)] border-2 border-border bg-surface px-3">
            {datasets.map((d) => <option key={d} value={d}>{vi.lab.datasets[d] ?? d}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-3 font-bold">
          {t.model}
          <select value={runId ?? ''} onChange={(e) => setChosen(e.target.value)} className="min-h-11 rounded-[var(--radius-xl)] border-2 border-border bg-surface px-3">
            {options.map((o) => <option key={o.run_id} value={o.run_id}>{o.model_name} ({o.run_id})</option>)}
          </select>
        </label>
      </div>

      {runId && !cur && <p>{t.loading}</p>}
      {cur?.failed && <p role="alert" className="font-bold text-danger-on-bg">{t.loadError}</p>}
      {cur?.run && !cm && <p>{t.noMatrix}</p>}
      {cm && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="font-extrabold">{t.matrixTitle}</h2>
            <p className="mb-2 text-sm text-text-muted">{t.matrixNote}</p>
            <ConfusionMatrix labels={cm.labels} matrix={cm.matrix} />
          </Card>
          <div className="flex flex-col gap-4">
            <Card className="overflow-x-auto">
              <h2 className="font-extrabold">{t.topTitle}</h2>
              <table className="mt-2 w-full text-left text-sm">
                <caption className="sr-only">{t.topCaption}</caption>
                <thead><tr className="text-text-muted"><th scope="col" className="py-1">{t.pair}</th><th scope="col">{t.rate}</th></tr></thead>
                <tbody>
                  {(cur?.run?.top_confusions ?? []).slice(0, 10).map((c) => (
                    <tr key={`${c.true}${c.pred}`} className="border-t border-border">
                      <th scope="row" className="py-1 font-bold">{c.true} → {c.pred}</th>
                      <td>{(c.rate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card>
              <h2 className="font-extrabold">{t.f1Title}</h2>
              <div role="img" aria-label={t.f1Label} className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                {f1.map((c) => (
                  <div key={c.label} className="grid grid-cols-[1.5rem_1fr_3rem] items-center gap-2 text-sm">
                    <span className="font-bold">{c.label}</span>
                    <div className="h-3 rounded-full bg-surface-2"><div className="h-3 rounded-full bg-brand-500" style={{ width: `${c.f1 * 100}%` }} /></div>
                    <span className="text-right">{(c.f1 * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
