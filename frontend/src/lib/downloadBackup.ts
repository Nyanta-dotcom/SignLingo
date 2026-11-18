import type { BackupFile } from '@/storage/backup';
import { downloadJson } from './downloadJson';

/** Saves the learner's backup as signlingo_backup_<date>.json (built and downloaded in the browser). */
export function downloadBackup(file: BackupFile, now: Date = new Date()): void {
  downloadJson(`signlingo_backup_${now.toISOString().slice(0, 10)}.json`, file, true);
}
