/** Frame timing statistics for the RQ3 evidence (docs/02 §5.4, AC-PERF-01). Pure: time is passed in. */

export type PerfSample = { nowMs: number; frameMs: number; mpMs: number; clsMs: number };
export type PerfStats = {
  frames: number;
  processingFps: number;
  frameMsP50: number;
  frameMsP95: number;
  frameMsMax: number;
  mpMsP50: number;
  mpMsP95: number;
  clsMsP50: number;
  clsMsP95: number;
  droppedFrames: number;
};

/** Nearest-rank percentile: the smallest value with at least p% of the samples at or below it. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return Number.NaN;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)];
}

export function createPerfMonitor({ windowSize = 600, dropGapMs = 50 } = {}) {
  let samples: PerfSample[] = [];
  return {
    record(s: PerfSample) {
      samples.push(s);
      if (samples.length > windowSize) samples.shift();
    },
    reset() {
      samples = [];
    },
    snapshot(): PerfStats {
      const n = samples.length;
      const col = (k: 'frameMs' | 'mpMs' | 'clsMs') => samples.map((s) => s[k]);
      const span = n > 1 ? samples[n - 1].nowMs - samples[0].nowMs : 0;
      let dropped = 0;
      for (let i = 1; i < n; i++) if (samples[i].nowMs - samples[i - 1].nowMs > dropGapMs) dropped++;
      return {
        frames: n,
        processingFps: span > 0 ? ((n - 1) / span) * 1000 : 0,
        frameMsP50: percentile(col('frameMs'), 50),
        frameMsP95: percentile(col('frameMs'), 95),
        frameMsMax: n ? Math.max(...col('frameMs')) : Number.NaN,
        mpMsP50: percentile(col('mpMs'), 50),
        mpMsP95: percentile(col('mpMs'), 95),
        clsMsP50: percentile(col('clsMs'), 50),
        clsMsP95: percentile(col('clsMs'), 95),
        droppedFrames: dropped,
      };
    },
  };
}

export type PerfMonitor = ReturnType<typeof createPerfMonitor>;
