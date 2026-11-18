/** Loads the static JSON that ml/ published (docs/04 §4). Same-origin only; every file is schema-checked. */

import {
  validateExperimentIndex, validateModelIndex, validateModelManifest, type Validation,
} from '@/storage/validate';

export class StaticDataError extends Error {
  constructor(
    readonly code: 'HTTP_ERROR' | 'SCHEMA_INVALID' | 'NO_ACTIVE_MODEL',
    message: string,
  ) {
    super(message);
    this.name = 'StaticDataError';
  }
}

export type ModelIndex = { schema_version: number; active: Record<string, string>; available: string[] };
export type ModelManifest = {
  model_id: string; version: string; task: string; file: string; sha256: string;
  labels: string[]; preprocess_version: string;
  recommended: { threshold: number; hold_ms: number; smoothing_window: number };
  metrics?: Record<string, number>; evaluation_note?: string;
} & Record<string, unknown>;
export type ExperimentIndex = { schema_version: number; runs: Array<Record<string, unknown>> } & Record<string, unknown>;

async function getJson<T>(path: string, check: (d: unknown) => Validation): Promise<T> {
  if (!/^\/(models|data)\//.test(path)) throw new Error(`refusing to fetch ${path}: only /models and /data`);
  const res = await fetch(path);
  if (!res.ok) throw new StaticDataError('HTTP_ERROR', `${path} -> HTTP ${res.status}`);
  const data = await res.json();
  const v = check(data);
  if (!v.ok) throw new StaticDataError('SCHEMA_INVALID', `${path} is not valid: ${v.errors.join('; ')}`);
  return data as T;
}

export const loadModelIndex = () => getJson<ModelIndex>('/models/index.json', validateModelIndex);
export const loadExperimentIndex = () => getJson<ExperimentIndex>('/data/experiments/index.json', validateExperimentIndex);

export async function loadActiveManifest(task: string): Promise<ModelManifest> {
  const index = await loadModelIndex();
  const active = index.active[task];
  if (!active) throw new StaticDataError('NO_ACTIVE_MODEL', `no active model for task ${task}`);
  return getJson<ModelManifest>(`/models/${active}.manifest.json`, validateModelManifest);
}
