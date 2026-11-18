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
});
