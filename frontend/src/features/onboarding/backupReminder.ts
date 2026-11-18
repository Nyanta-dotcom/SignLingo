export const REMIND_AFTER_DAYS = 7;
export const REMIND_AT_XP = 100;

const DAY_MS = 86_400_000;
const daysSince = (iso: string, now: Date) => (now.getTime() - new Date(iso).getTime()) / DAY_MS;

/**
 * Backup nudge (docs/05 §5.1): after 7 days without an export, or once there is 100 XP and no export yet.
 * Nothing to back up while XP is 0. Closing the banner silences it for 7 days.
 */
export function shouldRemindBackup(o: { totalXp: number; createdAt: string; lastExportAt?: string; dismissedAt?: string; now: Date }): boolean {
  if (o.totalXp <= 0) return false;
  if (o.dismissedAt && daysSince(o.dismissedAt, o.now) < REMIND_AFTER_DAYS) return false;
  if (!o.lastExportAt && o.totalXp >= REMIND_AT_XP) return true;
  return daysSince(o.lastExportAt ?? o.createdAt, o.now) >= REMIND_AFTER_DAYS;
}
