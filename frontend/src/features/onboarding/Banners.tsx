import { Button } from '@/components/ui/Button';
import { vi } from '@/i18n/vi';
import { downloadBackup } from '@/lib/downloadBackup';
import { useLearner } from '@/storage/useLearner';
import { shouldRemindBackup } from './backupReminder';

/** Notices above the page: storage blocked and backup nudge. */
export function Banners({ now = () => new Date() }: { now?: () => Date }) {
  const available = useLearner((s) => s.storageAvailable);
  const xp = useLearner((s) => s.stats.total_xp);
  const created = useLearner((s) => s.profile.created_at);
  const reminder = useLearner((s) => s.reminder);
  const backup = useLearner((s) => s.backup);
  const dismiss = useLearner((s) => s.dismissBackupReminder);
  const t = vi.banners;
  const remind = available && shouldRemindBackup({
    totalXp: xp, createdAt: created, lastExportAt: reminder.last_export_at, dismissedAt: reminder.dismissed_at, now: now(),
  });
  if (available && !remind) return null;
  return (
    <div className="flex flex-col gap-2 px-4 pt-4 md:px-8">
      {!available && (
        <p role="alert" className="rounded-2xl border-2 border-warning-fg/25 bg-warning-bg/60 px-4 py-3 text-sm font-bold text-warning-fg">
          <span aria-hidden="true">⚠ </span>{t.storageBlocked}
        </p>
      )}
      {remind && (
        <div role="region" aria-label={t.backupTitle} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-brand-200 bg-brand-50 px-4 py-3">
          <p className="flex-1 text-sm font-extrabold text-text">{t.backupTitle}</p>
          <Button size="sm" onClick={() => downloadBackup(backup.exportBackup())}>{t.backupAction}</Button>
          <Button size="sm" variant="ghost" onClick={dismiss}>{t.backupClose}</Button>
        </div>
      )}
    </div>
  );
}
