import { describe, expect, it } from 'vitest';
import { shouldRemindBackup } from './backupReminder';

const created = '2026-03-01T00:00:00Z';
const at = (day: number) => new Date(Date.UTC(2026, 2, 1 + day));
const base = { totalXp: 30, createdAt: created };

describe('shouldRemindBackup', () => {
  it('stays quiet when there is nothing to back up', () => {
    expect(shouldRemindBackup({ ...base, totalXp: 0, now: at(30) })).toBe(false);
  });

  it('reminds after 7 days without any export, not before', () => {
    expect(shouldRemindBackup({ ...base, now: at(6) })).toBe(false);
    expect(shouldRemindBackup({ ...base, now: at(7) })).toBe(true);
  });

  it('reminds at 100 XP when never exported, even on day one', () => {
    expect(shouldRemindBackup({ ...base, totalXp: 99, now: at(1) })).toBe(false);
    expect(shouldRemindBackup({ ...base, totalXp: 100, now: at(1) })).toBe(true);
  });

  it('counts the 7 days from the last export, and 100 XP alone no longer triggers after an export', () => {
    const last = at(10).toISOString();
    expect(shouldRemindBackup({ ...base, totalXp: 500, lastExportAt: last, now: at(12) })).toBe(false);
    expect(shouldRemindBackup({ ...base, totalXp: 500, lastExportAt: last, now: at(17) })).toBe(true);
  });

  it('is silenced for 7 days after the banner is closed', () => {
    const dismissed = at(8).toISOString();
    expect(shouldRemindBackup({ ...base, dismissedAt: dismissed, now: at(10) })).toBe(false);
    expect(shouldRemindBackup({ ...base, dismissedAt: dismissed, now: at(15) })).toBe(true);
  });
});
