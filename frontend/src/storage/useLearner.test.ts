import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { createKV } from './kv';
import { createLearnerState } from './useLearner';

const MODEL = { model_id: 'm', version: '1.0.0' };
const NOW = new Date('2026-03-01T03:00:00Z');
const make = () => createLearnerState(createKV(), { now: () => NOW, heartThreshold: 0.6, appVersion: '0.1.0' });

beforeEach(() => localStorage.clear());

describe('useLearner store', () => {
  it('exposes the stored state and updates it through actions', () => {
    const useLearner = make();
    const { result } = renderHook(() => useLearner((s) => s.settings.theme));
    expect(result.current).toBe('system');
    act(() => useLearner.getState().updateSettings({ theme: 'dark' }));
    expect(result.current).toBe('dark');
    expect(createLearnerState(createKV(), { now: () => NOW, heartThreshold: 0.6, appVersion: '0.1.0' }).getState().settings.theme).toBe('dark');
  });

  it('refreshes stats and progress after a session completes', () => {
    const useLearner = make();
    const a = useLearner.getState();
    const s = a.startSession({ mode: 'lesson', lesson_code: 'L1', model: MODEL });
    a.recordAttempt(s.id, {
      item_order: 1, position: null, expected: 'A', predicted: 'A', confidence: 0.9, result: 'correct',
      time_to_verify_ms: 900, retries: 0, confused_with: null,
    });
    a.completeSession(s.id, { xpReward: 10 });
    const st = useLearner.getState();
    expect(st.stats.total_xp).toBe(20);
    expect(st.progress.L1.status).toBe('completed');
    expect(st.storageAvailable).toBe(true);
  });

  it('reports storage as unavailable when the browser blocks it', () => {
    const useLearner = createLearnerState(createKV(null), { now: () => NOW, heartThreshold: 0.6, appVersion: '0.1.0' });
    expect(useLearner.getState().storageAvailable).toBe(false);
  });

  it('keeps recorded benchmarks, newest first, and they survive a reload', () => {
    const useLearner = make();
    const rec = (id: string) => ({
      id, recorded_at: '2026-03-01T00:00:00Z', duration_s: 60 as const, model: MODEL, backend: 'wasm' as const, delegate: 'CPU' as const,
      worker: false, camera: { width: 640, height: 480, fps_reported: 30 }, frame_ms: { p50: 1, p95: 2, max: 3 },
      mp_ms: { p50: 1, p95: 2 }, cls_ms: { p50: 1, p95: 2 }, processing_fps_avg: 30, dropped_frames: 0, user_agent: 't',
    });
    expect(useLearner.getState().benchmarks).toEqual([]);
    expect(useLearner.getState().saveBenchmark(rec('a'))).toBe(true);
    useLearner.getState().saveBenchmark(rec('b'));
    expect(useLearner.getState().benchmarks.map((b) => b.id)).toEqual(['b', 'a']);
    expect(make().getState().benchmarks.map((b) => b.id)).toEqual(['b', 'a']);
  });

  it('stores an optional display name (trimmed, capped at 30) and clears it when empty', () => {
    const useLearner = make();
    expect(useLearner.getState().profile.display_name).toBeUndefined();
    useLearner.getState().setDisplayName('  Lan  ');
    expect(useLearner.getState().profile.display_name).toBe('Lan');
    expect(make().getState().profile.display_name).toBe('Lan');
    useLearner.getState().setDisplayName('x'.repeat(50));
    expect(useLearner.getState().profile.display_name).toHaveLength(30);
    useLearner.getState().setDisplayName('   ');
    expect(useLearner.getState().profile.display_name).toBeUndefined();
  });

  it('remembers that onboarding is done, across reloads', () => {
    const useLearner = make();
    expect(useLearner.getState().onboarded).toBe(false);
    useLearner.getState().completeOnboarding();
    expect(useLearner.getState().onboarded).toBe(true);
    expect(make().getState().onboarded).toBe(true);
  });
});
