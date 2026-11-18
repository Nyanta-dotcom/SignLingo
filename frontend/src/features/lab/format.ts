import type { Stat } from './selectors';

/** "97.9 ± 0.3 %" (the ± is dropped for a single run). */
export function pct(s: Stat | null, digits = 1): string {
  if (!s) return '—';
  const m = (s.mean * 100).toFixed(digits);
  return s.n > 1 ? `${m} ± ${(s.std * 100).toFixed(digits)}%` : `${m}%`;
}

export function ms(s: Stat | null): string {
  return s ? s.mean.toFixed(2) : '—';
}

/** Row label that stays unique: adds the feature set, then the config id, only when names collide. */
export function rowLabel(r: { id: string; model_name: string; feature_set: string }, rows: Array<{ id: string; model_name: string; feature_set: string }>): string {
  const sameName = rows.filter((x) => x.model_name === r.model_name);
  if (sameName.length < 2) return r.model_name;
  const sameFeat = sameName.filter((x) => x.feature_set === r.feature_set);
  return sameFeat.length < 2 ? `${r.model_name} · ${r.feature_set}` : `${r.model_name} · ${r.id}`;
}
