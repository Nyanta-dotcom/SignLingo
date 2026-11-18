import { beforeEach, describe, expect, it } from 'vitest';
import { createKV } from './kv';
import { createLearnerStore } from './learnerStore';
import { createSessions } from './sessions';
import type { Attempt } from './types';

const MODEL = { model_id: 'landmark-mlp-ens5', version: '1.0.0' };
let t = new Date('2026-03-01T03:00:00Z').getTime();
const clock = () => new Date(t);
const setup = () => {
  const learner = createLearnerStore(createKV(), clock);
  return { learner, sessions: createSessions(learner, { heartThreshold: 0.6 }) };
};
const attempt = (over: Partial<Attempt> = {}): Attempt => ({
  item_order: 1, position: null, expected: 'A', predicted: 'A', confidence: 0.9,
  result: 'correct', time_to_verify_ms: 1000, retries: 0, confused_with: null, ...over,
});

beforeEach(() => {
  localStorage.clear();
  t = new Date('2026-03-01T03:00:00Z').getTime();
});

describe('sessions', () => {
  it('start -> attempts -> complete -> reload reads the same state', () => {
    const { learner, sessions } = setup();
    const s = sessions.startSession({ mode: 'lesson', lesson_code: 'L1', model: MODEL });
    sessions.recordAttempt(s.id, attempt());
    sessions.recordAttempt(s.id, attempt({ item_order: 2, expected: 'B', predicted: 'B' }));
    const done = sessions.completeSession(s.id, { xpReward: 10 });
    expect(done).toMatchObject({ status: 'completed', accuracy_pct: 100, xp_awarded: 20 });

    const reloaded = setup();
    expect(reloaded.learner.getStats().total_xp).toBe(20);
    expect(reloaded.learner.getProgress().L1).toMatchObject({ status: 'completed', times_completed: 1, best_accuracy_pct: 100 });
    expect(reloaded.learner.getDaily()['2026-03-01']).toMatchObject({ xp_earned: 20, lessons_completed: 1, goal_met: true });
    expect(reloaded.learner.getSignStats().A).toMatchObject({ attempts: 1, correct: 1 });
    expect(reloaded.sessions.list()).toHaveLength(1);
    expect(learner.getStats().current_streak).toBe(1);
  });

  it('completing twice gives XP once (AC-GAM-01)', () => {
    const { learner, sessions } = setup();
    const s = sessions.startSession({ mode: 'lesson', lesson_code: 'L1', model: MODEL });
    sessions.recordAttempt(s.id, attempt());
    sessions.completeSession(s.id, { xpReward: 10 });
    sessions.completeSession(s.id, { xpReward: 10 });
    expect(learner.getStats().total_xp).toBe(20);
    expect(learner.getProgress().L1.times_completed).toBe(1);
  });

  it('loses a heart on a confident miss but not on an unsure one, and drops the no-heart bonus', () => {
    const { learner, sessions } = setup();
    const s = sessions.startSession({ mode: 'lesson', lesson_code: 'L1', model: MODEL });
    sessions.recordAttempt(s.id, attempt({ result: 'timed_out', confidence: 0.3, predicted: 'B' }));
    expect(learner.getStats().hearts).toBe(5);
    sessions.recordAttempt(s.id, attempt({ result: 'timed_out', confidence: 0.8, predicted: 'B' }));
    expect(learner.getStats().hearts).toBe(4);
    const done = sessions.completeSession(s.id, { xpReward: 10 });
    expect(done.xp_awarded).toBe(10 + 0 + 0); // 0% correct, a heart lost
  });

  it('ends the session as failed_no_hearts when the last heart goes', () => {
    const { learner, sessions } = setup();
    learner.saveStats({ ...learner.getStats(), hearts: 1 });
    const s = sessions.startSession({ mode: 'lesson', lesson_code: 'L1', model: MODEL });
    const r = sessions.recordAttempt(s.id, attempt({ result: 'skipped', confidence: 0.9, predicted: 'C' }));
    expect(r.status).toBe('failed_no_hearts');
    expect(r.completed_at).not.toBeNull();
    expect(learner.getStats().total_xp).toBe(0);
  });

  it('free practice never costs hearts and gives no XP', () => {
    const { learner, sessions } = setup();
    const s = sessions.startSession({ mode: 'free_practice', lesson_code: null, model: MODEL });
    sessions.recordAttempt(s.id, attempt({ result: 'timed_out', confidence: 0.9 }));
    expect(learner.getStats().hearts).toBe(5);
    expect(sessions.completeSession(s.id, {}).xp_awarded).toBe(0);
  });

  it('abandoned sessions stay abandoned and keep at most 200 records', () => {
    const { sessions } = setup();
    for (let i = 0; i < 205; i++) {
      const s = sessions.startSession({ mode: 'free_practice', lesson_code: null, model: MODEL });
      if (i === 204) expect(sessions.abandonSession(s.id).status).toBe('abandoned');
    }
    expect(sessions.list()).toHaveLength(200);
  });

  it('unknown session ids are an error', () => {
    expect(() => setup().sessions.completeSession('nope', {})).toThrow(/unknown session/);
  });
});
