/** The only React-facing door to learner data (P2-15): a Zustand store over LearnerStore + sessions. */

import { create } from 'zustand';
import { createBackup } from './backup';
import { createBenchmarks } from './benchmarks';
import { createKV, type KV } from './kv';
import { createLearnerStore } from './learnerStore';
import { createSessions } from './sessions';
import type { Attempt, DailyActivity, LessonProgress, ModelRef, SessionRecord, PerfRecord, Profile, Settings, SignStat, Stats } from './types';

type Options = { now?: () => Date; heartThreshold: number; appVersion: string };

export type BackupReminder = { last_export_at?: string; dismissed_at?: string };

type State = {
  profile: Profile;
  onboarded: boolean;
  reminder: BackupReminder;
  settings: Settings;
  stats: Stats;
  progress: Record<string, LessonProgress>;
  daily: Record<string, DailyActivity>;
  signStats: Record<string, SignStat>;
  storageAvailable: boolean;
  benchmarks: PerfRecord[];
  saveBenchmark(record: PerfRecord): boolean;
  refresh(): void;
  updateSettings(patch: Partial<Settings>): void;
  setDisplayName(name: string): void;
  completeOnboarding(): void;
  dismissBackupReminder(): void;
  startSession(input: { mode: SessionRecord['mode']; lesson_code: string | null; model: ModelRef }): SessionRecord;
  recordAttempt(id: string, attempt: Attempt): SessionRecord;
  completeSession(id: string, opts: { xpReward?: number }): SessionRecord;
  abandonSession(id: string): SessionRecord;
  backup: ReturnType<typeof createBackup>;
};

export function createLearnerState(kv: KV, { now = () => new Date(), heartThreshold, appVersion }: Options) {
  const learner = createLearnerStore(kv, now);
  const sessions = createSessions(learner, { heartThreshold });
  const backup = createBackup(kv, { appVersion, now });
  const bench = createBenchmarks(kv);
  const snapshot = () => ({
    profile: learner.getProfile(), onboarded: kv.get<boolean>('onboarded', false),
    reminder: kv.get<BackupReminder>('backup_reminder', {}), settings: learner.getSettings(), stats: learner.getStats(), progress: learner.getProgress(),
    daily: learner.getDaily(), signStats: learner.getSignStats(), storageAvailable: kv.available,
    benchmarks: bench.listBenchmarks(),
  });

  return create<State>((set) => {
    const after = <T>(result: T): T => (set(snapshot()), result);
    return {
      ...snapshot(),
      backup: {
        ...backup,
        exportBackup: () => {
          const file = backup.exportBackup();
          kv.set('backup_reminder', { last_export_at: now().toISOString() });
          return after(file);
        },
        importBackup: (raw) => after(backup.importBackup(raw)),
        clearAll: () => after(backup.clearAll()),
      },
      saveBenchmark: (record) => after(bench.saveBenchmark(record)),
      refresh: () => set(snapshot()),
      updateSettings: (patch) => after(void learner.updateSettings(patch)),
      completeOnboarding: () => after(void kv.set('onboarded', true)),
      dismissBackupReminder: () => after(void kv.set('backup_reminder', { ...kv.get<BackupReminder>('backup_reminder', {}), dismissed_at: now().toISOString() })),
      setDisplayName: (name) => after(void learner.updateProfile({ display_name: name })),
      startSession: (input) => after(sessions.startSession(input)),
      recordAttempt: (id, attempt) => after(sessions.recordAttempt(id, attempt)),
      completeSession: (id, opts) => after(sessions.completeSession(id, opts)),
      abandonSession: (id) => after(sessions.abandonSession(id)),
    };
  });
}

let singleton: ReturnType<typeof createLearnerState> | undefined;

/** App-wide hook. `heartThreshold` comes from the model manifest's recommended threshold (not hard-coded here). */
export function initLearner(options: Options) {
  singleton ??= createLearnerState(createKV(), options);
  return singleton;
}

export function useLearner<T>(selector: (s: State) => T): T {
  if (!singleton) throw new Error('call initLearner() once at app start before useLearner()');
  return singleton(selector);
}
