/** "Record 60 s benchmark" results: the evidence for RQ3 (docs/03 §3.4). Latest 20 are kept. */

import type { KV } from './kv';
import type { PerfRecord } from './types';

export const MAX_BENCHMARKS = 20;

export function createBenchmarks(kv: KV) {
  const stored = () => kv.get<PerfRecord[]>('benchmarks', []);
  return {
    saveBenchmark(record: PerfRecord): boolean {
      return kv.set('benchmarks', [...stored(), record].slice(-MAX_BENCHMARKS));
    },
    /** Newest first. */
    listBenchmarks: (): PerfRecord[] => [...stored()].reverse(),
  };
}
