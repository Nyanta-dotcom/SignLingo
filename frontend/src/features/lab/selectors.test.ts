import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { benchmarkRows, bestBaseline, configId, inspectableRuns, leakageSummary, parseRuns, stat, weakestFirst, type LeakageRun } from './selectors';

const index = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/experiments/index.json'), 'utf-8'));
const runs = parseRuns(index.runs);

const run = (run_id: string, kind: string, test_macro_f1: number, over: Record<string, unknown> = {}) => ({
  run_id, kind, dataset: 'sign_mnist', model_name: 'M', feature_set: 'f', split_strategy: 'group_ward70',
  metrics: { val_macro_f1: 0.5, test_macro_f1, test_acc: 0.6, error_rate: 0.4 }, ...over,
});

describe('stat', () => {
  it('is mean and sample std; a single value has std 0; empty is null', () => {
    const s = stat([1, 2, 3]);
    expect(s?.mean).toBe(2);
    expect(s?.std).toBe(1);
    expect(stat([0.5])).toEqual({ mean: 0.5, std: 0, n: 1 });
    expect(stat([])).toBeNull();
  });
});

describe('benchmarkRows', () => {
  it('merges seeds of one configuration and orders baselines before main, low to high F1', () => {
    const rows = benchmarkRows(parseRuns([
      run('cnn_s42', 'main', 0.9), run('cnn_s43', 'main', 0.8), run('lr_s42', 'baseline', 0.7), run('maj_s42', 'baseline', 0.1),
    ]), 'sign_mnist');
    expect(rows.map((r) => r.id)).toEqual(['maj', 'lr', 'cnn']);
    expect(rows[2].test_f1).toMatchObject({ n: 2 });
    expect(rows[2].test_f1?.mean).toBeCloseTo(0.85, 10);
  });

  it('ignores other datasets and ablations, and the best baseline is the highest baseline', () => {
    const rows = benchmarkRows(parseRuns([
      run('a_s1', 'baseline', 0.3), run('b_s1', 'baseline', 0.6), run('c_s1', 'ablation', 0.99), run('d_s1', 'main', 0.95, { dataset: 'landmarks' }),
    ]), 'sign_mnist');
    expect(rows.map((r) => r.id)).toEqual(['a', 'b']);
    expect(bestBaseline(rows)?.id).toBe('b');
    expect(bestBaseline([])).toBeNull();
  });

  it('keeps ensembles (no seed suffix) as their own row', () => {
    expect(configId('cnn_ens_wide_e30_n5')).toBe('cnn_ens_wide_e30_n5');
    expect(configId('cnn_main_wide_e30_s44')).toBe('cnn_main_wide_e30');
  });

  it('matches the numbers in the published index (mean over seeds, computed independently)', () => {
    const rows = benchmarkRows(runs, 'sign_mnist');
    const seeds = index.runs.filter((r: { run_id: string }) => /^baseline_mlp_hog_s\d+$/.test(r.run_id));
    const expected = seeds.reduce((a: number, r: { metrics: { test_macro_f1: number } }) => a + r.metrics.test_macro_f1, 0) / seeds.length;
    expect(rows.find((r) => r.id === 'baseline_mlp_hog')?.test_f1?.mean).toBeCloseTo(expected, 12);
    expect(rows.at(-1)?.kind).toBe('main');
  });
});

describe('leakageSummary', () => {
  it('averages validation and test accuracy per split', () => {
    const l: LeakageRun[] = [
      { run_id: 'a', model_name: 'LR', split_strategy: 'random', val_acc: 1, test_acc: 0.7, val_test_gap: 0.3 },
      { run_id: 'b', model_name: 'LR', split_strategy: 'random', val_acc: 0.9, test_acc: 0.7, val_test_gap: 0.2, nn_dist_val_to_train: 0.4 },
      { run_id: 'c', model_name: 'LR', split_strategy: 'group_ward70', val_acc: 0.75, test_acc: 0.7, val_test_gap: 0.05 },
    ];
    const g = leakageSummary(l);
    expect(g.map((x) => x.split)).toEqual(['random', 'group_ward70']);
    expect(g[0].val_acc.mean).toBeCloseTo(0.95, 10);
    expect(g[0].nn_dist?.mean).toBe(0.4);
    expect(g[1].nn_dist).toBeNull();
  });

  it('on the published study, random split leaks (bigger val-test gap) than the group split', () => {
    const g = leakageSummary(index.leakage_study);
    const gap = (s: string) => g.find((x) => x.split === s)?.gap.mean ?? NaN;
    expect(gap('random')).toBeGreaterThan(gap('group_ward70'));
  });
});

describe('error analysis selectors', () => {
  it('lists the weakest letters first', () => {
    expect(weakestFirst({ A: 1, B: 0.5, C: 0.8 }).map((x) => x.label)).toEqual(['B', 'C', 'A']);
  });

  it('offers main runs of a dataset with the ensemble first', () => {
    const rs = parseRuns([run('m_s43', 'main', 0.9), run('m_ens', 'main', 0.95), run('b_s42', 'baseline', 0.5), run('x_s42', 'main', 0.9, { dataset: 'landmarks' })]);
    expect(inspectableRuns(rs, 'sign_mnist').map((r) => r.run_id)).toEqual(['m_ens', 'm_s43']);
  });
});
