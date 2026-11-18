import { useEffect, useMemo, useState } from 'react';
import { loadExperimentIndex, type ExperimentIndex, type ExperimentRun } from '@/app/staticData';
import { vi } from '@/i18n/vi';
import type { EngineFactory } from '../practice/useRecognition';
import { Benchmark } from './Benchmark';
import { ErrorAnalysis } from './ErrorAnalysis';
import { Leakage } from './Leakage';
import { LiveMonitor } from './LiveMonitor';
import { parseRuns, type LeakageRun } from './selectors';

type TabId = 'benchmark' | 'errors' | 'live' | 'leakage';
const TABS: TabId[] = ['benchmark', 'errors', 'live', 'leakage'];

/** AI Lab (/lab, docs/05 §5.5): evidence for the graders, every number read from /data/experiments. */
export function Lab({ load = loadExperimentIndex, loadRun, factory }: {
  load?: () => Promise<ExperimentIndex>; loadRun?: (id: string) => Promise<ExperimentRun>; factory?: EngineFactory;
}) {
  const [index, setIndex] = useState<ExperimentIndex | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<TabId>('benchmark');

  useEffect(() => {
    let live = true;
    load().then((d) => live && setIndex(d)).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [load]);

  const runs = useMemo(() => parseRuns(index?.runs ?? []), [index]);
  const datasets = useMemo(() => ((index?.datasets as string[] | undefined) ?? [...new Set(runs.map((r) => r.dataset))]), [index, runs]);
  const leakage = (index?.leakage_study as LeakageRun[] | undefined) ?? [];

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-4">
      <h1 className="text-3xl font-extrabold">{vi.lab.title}</h1>
      <p className="text-text-muted">{vi.lab.intro}</p>
      {failed && <p role="alert" className="font-bold text-danger-on-bg">{vi.lab.loadError}</p>}
      {!index && !failed && <p>{vi.lab.loading}</p>}
      {index && (
        <>
          <div role="tablist" aria-label={vi.lab.tablist} className="flex flex-wrap gap-2">
            {TABS.map((id) => (
              <button
                key={id} id={`tab-${id}`} role="tab" type="button" aria-selected={tab === id} aria-controls={`panel-${id}`}
                onClick={() => setTab(id)}
                className={`min-h-11 rounded-full border-2 px-4 font-extrabold ${tab === id ? 'border-brand-500 bg-brand-600 text-text-on-brand' : 'border-border bg-surface'}`}
              >
                {vi.lab.tabs[id]}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'benchmark' && <Benchmark runs={runs} datasets={datasets} />}
            {tab === 'errors' && <ErrorAnalysis runs={runs} datasets={datasets} loadRun={loadRun} />}
            {tab === 'live' && <LiveMonitor factory={factory} />}
            {tab === 'leakage' && <Leakage runs={leakage} />}
          </div>
        </>
      )}
    </section>
  );
}
