import { beforeEach, describe, expect, it } from 'vitest';
import { createBackup, BackupError } from './backup';
import { createKV } from './kv';
import { createLearnerStore } from './learnerStore';

const NOW = new Date('2026-03-01T03:00:00Z');
const setup = () => {
  const kv = createKV();
  const learner = createLearnerStore(kv, () => NOW);
  return { kv, learner, backup: createBackup(kv, { appVersion: '0.1.0', now: () => NOW }) };
};

beforeEach(() => localStorage.clear());

describe('backup', () => {
  it('export -> clear -> import restores the same state (AC-ACC-01)', () => {
    const { kv, learner, backup } = setup();
    learner.updateSettings({ theme: 'dark', daily_xp_goal: 30 });
    learner.saveStats({ ...learner.getStats(), total_xp: 42, current_streak: 2, longest_streak: 3 });
    learner.saveProgress({ L1: { status: 'completed', best_accuracy_pct: 90, times_completed: 1, last_completed_at: 'x' } });
    const file = JSON.parse(JSON.stringify(backup.exportBackup())); // what a downloaded file holds

    backup.clearAll();
    expect(kv.keys()).toEqual([]);
    backup.importBackup(file);
    expect(JSON.parse(JSON.stringify(backup.exportBackup()))).toEqual(file);
    expect(learner.getSettings()).toMatchObject({ theme: 'dark', daily_xp_goal: 30 });
  });

  it('file names the schema version and app version', () => {
    const f = setup().backup.exportBackup();
    expect(f).toMatchObject({ schema_version: 1, app_version: '0.1.0', exported_at: NOW.toISOString() });
  });

  it('rejects an invalid file with BACKUP_INVALID and leaves current data untouched', () => {
    const { learner, backup } = setup();
    learner.updateSettings({ theme: 'dark' });
    expect(() => backup.importBackup({ schema_version: 1 })).toThrow(BackupError);
    try {
      backup.importBackup('garbage');
    } catch (e) {
      expect((e as BackupError).code).toBe('BACKUP_INVALID');
    }
    expect(learner.getSettings().theme).toBe('dark');
  });

  it('rejects a file from a newer app version', () => {
    const { backup } = setup();
    const f = { ...backup.exportBackup(), schema_version: 99 };
    expect(() => backup.importBackup(f)).toThrow(/BACKUP_INVALID|newer/);
  });
});
