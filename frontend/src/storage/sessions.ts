/** Sessions: start, record attempts, complete (idempotent), abandon (docs/03 §3.3, AC-GAM-01). */

import { loseHeart } from '@/game/hearts';
import { applyDailyXp } from '@/game/streak';
import { computeXp } from '@/game/xp';
import type { LearnerStore } from './learnerStore';
import type { Attempt, ModelRef, SessionRecord } from './types';

export const MAX_SESSIONS = 200;
type Options = { heartThreshold: number };

export function createSessions(learner: LearnerStore, { heartThreshold }: Options) {
  const kv = learner.kv;
  const list = () => kv.get<SessionRecord[]>('sessions', []);
  const save = (all: SessionRecord[]) => kv.set('sessions', all.slice(-MAX_SESSIONS));
  const isOpen = (s: SessionRecord) => s.completed_at === null;

  const update = (id: string, change: (s: SessionRecord) => SessionRecord): SessionRecord => {
    const all = list();
    const i = all.findIndex((s) => s.id === id);
    if (i < 0) throw new Error(`unknown session ${id}`);
    all[i] = change(all[i]);
    save(all);
    return all[i];
  };

  function updateSignStat(a: Attempt) {
    const stats = learner.getSignStats();
    const prev = stats[a.expected] ?? { attempts: 0, correct: 0, avg_time_to_verify_ms: 0 };
    const correct = prev.correct + (a.result === 'correct' ? 1 : 0);
    const timed = a.result === 'correct' && a.time_to_verify_ms !== null;
    const avg = timed ? (prev.avg_time_to_verify_ms * prev.correct + (a.time_to_verify_ms ?? 0)) / correct : prev.avg_time_to_verify_ms;
    learner.saveSignStats({ ...stats, [a.expected]: { attempts: prev.attempts + 1, correct, avg_time_to_verify_ms: avg } });
  }

  return {
    list,
    startSession(input: { mode: SessionRecord['mode']; lesson_code: string | null; model: ModelRef }): SessionRecord {
      const record: SessionRecord = {
        id: crypto.randomUUID(), ...input, started_at: learner.now().toISOString(), completed_at: null,
        status: 'abandoned', accuracy_pct: null, xp_awarded: 0, hearts_lost: 0, attempts: [], perf: null,
      };
      save([...list(), record]);
      return record;
    },
    recordAttempt(id: string, attempt: Attempt): SessionRecord {
      updateSignStat(attempt);
      return update(id, (s) => {
        if (!isOpen(s)) return s;
        const next = { ...s, attempts: [...s.attempts, attempt] };
        if (s.mode !== 'lesson' || attempt.result === 'correct') return next;
        const r = loseHeart(learner.getStats(), learner.now().getTime(), {
          confidence: attempt.confidence, threshold: heartThreshold,
        });
        learner.saveStats(r.stats);
        if (!r.lost) return next;
        const out = { ...next, hearts_lost: s.hearts_lost + 1 };
        return r.stats.hearts === 0
          ? { ...out, status: 'failed_no_hearts', completed_at: learner.now().toISOString() }
          : out;
      });
    },
    completeSession(id: string, { xpReward }: { xpReward?: number }): SessionRecord {
      const existing = list().find((s) => s.id === id);
      if (!existing) throw new Error(`unknown session ${id}`);
      if (!isOpen(existing)) return existing; // idempotent: no second XP
      const now = learner.now();
      const total = existing.attempts.length;
      const accuracy = total ? existing.attempts.filter((a) => a.result === 'correct').length / total : 0;
      const isLesson = existing.mode === 'lesson' && existing.lesson_code !== null;
      const xp = isLesson ? computeXp({ xpReward, accuracy, heartsLost: existing.hearts_lost }).total : 0;
      if (isLesson) {
        const code = existing.lesson_code as string;
        const stats = learner.getStats();
        const day = applyDailyXp(stats, learner.getDaily(), xp, learner.getSettings().daily_xp_goal, now, learner.timezone(), true);
        learner.saveStats({ ...stats, ...day.stats });
        learner.saveDaily(day.daily);
        const progress = learner.getProgress();
        const prev = progress[code];
        learner.saveProgress({
          ...progress,
          [code]: {
            status: 'completed', times_completed: (prev?.times_completed ?? 0) + 1,
            best_accuracy_pct: Math.max(prev?.best_accuracy_pct ?? 0, Math.round(accuracy * 100)),
            last_completed_at: now.toISOString(),
          },
        });
      }
      return update(id, (s) => ({
        ...s, status: 'completed', completed_at: now.toISOString(),
        accuracy_pct: Math.round(accuracy * 100), xp_awarded: xp,
      }));
    },
    abandonSession(id: string): SessionRecord {
      return update(id, (s) => (isOpen(s) ? { ...s, status: 'abandoned', completed_at: learner.now().toISOString() } : s));
    },
  };
}
