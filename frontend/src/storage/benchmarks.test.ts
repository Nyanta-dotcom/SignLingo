import { beforeEach, describe, expect, it } from 'vitest';
import { createBenchmarks, MAX_BENCHMARKS } from './benchmarks';
import { createKV } from './kv';
import type { PerfRecord } from './types';

const rec = (id: string): PerfRecord => ({
  id, recorded_at: '2026-03-01T00:00:00Z', duration_s: 60,
  model: { model_id: 'm', version: '1.0.0' }, backend: 'wasm', delegate: 'CPU', worker: false,
  camera: { width: 640, height: 480, fps_reported: 30 },
  frame_ms: { p50: 10, p95: 20, max: 40 }, mp_ms: { p50: 5, p95: 8 }, cls_ms: { p50: 1, p95: 2 },
  processing_fps_avg: 45, dropped_frames: 0, user_agent: 'test',
});

beforeEach(() => localStorage.clear());

describe('benchmarks', () => {
  it('saves records and lists them newest first, across a reload', () => {
    const b = createBenchmarks(createKV());
    b.saveBenchmark(rec('a'));
    b.saveBenchmark(rec('b'));
    expect(createBenchmarks(createKV()).listBenchmarks().map((r) => r.id)).toEqual(['b', 'a']);
  });

  it('keeps only the latest 20 (docs/03 §3.1)', () => {
    const b = createBenchmarks(createKV());
    for (let i = 0; i < MAX_BENCHMARKS + 5; i++) b.saveBenchmark(rec(`r${i}`));
    const ids = b.listBenchmarks().map((r) => r.id);
    expect(ids).toHaveLength(MAX_BENCHMARKS);
    expect(ids[0]).toBe(`r${MAX_BENCHMARKS + 4}`);
  });
});
