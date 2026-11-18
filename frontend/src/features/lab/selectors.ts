/** Pure selectors over the experiment index published by ml/ (docs/05 §5.5). No numbers live here, only arithmetic. */

export type Stat = { mean: number; std: number; n: number };
export type Run = {
  run_id: string; kind: string; dataset: string; model_name: string; feature_set: string;
  split_strategy: string; metrics: Record<string, number>;
};
export type LeakageRun = {
  run_id: string; model_name: string; split_strategy: string; val_acc: number; test_acc: number;
  val_test_gap: number; nn_dist_val_to_train?: number;
};
export type BenchmarkRow = {
  id: string; kind: string; model_name: string; feature_set: string; split_strategy: string;
  val_f1: Stat | null; test_acc: Stat | null; test_f1: Stat | null; error_rate: Stat | null; latency_ms: Stat | null;
};

/** Mean and sample standard deviation (n-1; 0 when there is a single run). */
export function stat(values: number[]): Stat | null {
  if (values.length === 0) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.length > 1 ? values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1) : 0;
  return { mean, std: Math.sqrt(variance), n: values.length };
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

export function parseRuns(raw: Array<Record<string, unknown>>): Run[] {
  return raw.flatMap((r) => {
    const m = r.metrics as Record<string, unknown> | undefined;
    if (typeof r.run_id !== 'string' || typeof r.kind !== 'string' || !m) return [];
    const metrics = Object.fromEntries(Object.entries(m).filter(([, v]) => isNum(v))) as Record<string, number>;
    return [{
      run_id: r.run_id, kind: r.kind, dataset: String(r.dataset), model_name: String(r.model_name),
      feature_set: String(r.feature_set), split_strategy: String(r.split_strategy), metrics,
    }];
  });
}

/** Runs that differ only by seed share an id: `cnn_main_wide_e30_s42` -> `cnn_main_wide_e30`. */
export const configId = (runId: string) => runId.replace(/_s\d+$/, '');

const KIND_ORDER: Record<string, number> = { baseline: 0, main: 1 };

/** One row per configuration (seeds merged) for baselines and main models of a dataset, worst to best by test F1. */
export function benchmarkRows(runs: Run[], dataset: string): BenchmarkRow[] {
  const groups = new Map<string, Run[]>();
  for (const r of runs) {
    if (r.dataset !== dataset || !(r.kind in KIND_ORDER)) continue;
    const id = configId(r.run_id);
    groups.set(id, [...(groups.get(id) ?? []), r]);
  }
  const col = (rs: Run[], key: string) => stat(rs.flatMap((r) => (isNum(r.metrics[key]) ? [r.metrics[key]] : [])));
  return [...groups.entries()]
    .map(([id, rs]): BenchmarkRow => ({
      id, kind: rs[0].kind, model_name: rs[0].model_name, feature_set: rs[0].feature_set, split_strategy: rs[0].split_strategy,
      val_f1: col(rs, 'val_macro_f1'), test_acc: col(rs, 'test_acc'), test_f1: col(rs, 'test_macro_f1'),
      error_rate: col(rs, 'error_rate'), latency_ms: col(rs, 'latency_ms'),
    }))
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || (a.test_f1?.mean ?? 0) - (b.test_f1?.mean ?? 0));
}

/** The strongest baseline, which the chart draws as the dashed reference line. */
export function bestBaseline(rows: BenchmarkRow[]): BenchmarkRow | null {
  const base = rows.filter((r) => r.kind === 'baseline' && r.test_f1);
  return base.reduce<BenchmarkRow | null>((best, r) => (!best || (r.test_f1?.mean ?? 0) > (best.test_f1?.mean ?? 0) ? r : best), null);
}

export type LeakageGroup = { split: string; val_acc: Stat; test_acc: Stat; gap: Stat; nn_dist: Stat | null };

/** Validation vs test accuracy per split strategy, averaged over seeds. */
export function leakageSummary(runs: LeakageRun[]): LeakageGroup[] {
  const splits = [...new Set(runs.map((r) => r.split_strategy))];
  return splits.map((split) => {
    const rs = runs.filter((r) => r.split_strategy === split);
    return {
      split,
      val_acc: stat(rs.map((r) => r.val_acc)) as Stat,
      test_acc: stat(rs.map((r) => r.test_acc)) as Stat,
      gap: stat(rs.map((r) => r.val_test_gap)) as Stat,
      nn_dist: stat(rs.flatMap((r) => (isNum(r.nn_dist_val_to_train) ? [r.nn_dist_val_to_train] : []))),
    };
  });
}

/** Per-class F1 sorted from the weakest letter up, so the problem letters come first. */
export function weakestFirst(f1: Record<string, number>): Array<{ label: string; f1: number }> {
  return Object.entries(f1).map(([label, v]) => ({ label, f1: v })).sort((a, b) => a.f1 - b.f1 || a.label.localeCompare(b.label));
}

/** Main runs of a dataset that can be inspected, best candidate first (ensembles, then the rest). */
export function inspectableRuns(runs: Run[], dataset: string): Run[] {
  return runs
    .filter((r) => r.kind === 'main' && r.dataset === dataset)
    .sort((a, b) => Number(/_ens/.test(b.run_id)) - Number(/_ens/.test(a.run_id)) || a.run_id.localeCompare(b.run_id));
}
