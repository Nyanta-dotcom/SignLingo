/** Export, import and clear learner data (docs/03 §3.6). Confirmation dialogs belong to the UI. */

import type { KV } from './kv';
import { CURRENT_VERSION, migrate } from './migrate';
import { validateBackup } from './validate';

export const DATA_KEYS = [
  'profile', 'settings', 'stats', 'progress', 'daily', 'sessions', 'sign_stats', 'benchmarks',
] as const;

export type BackupFile = {
  schema_version: number;
  exported_at: string;
  app_version: string;
  data: Record<string, unknown>;
};

export class BackupError extends Error {
  readonly code = 'BACKUP_INVALID';
}

export function createBackup(kv: KV, { appVersion, now }: { appVersion: string; now: () => Date }) {
  return {
    exportBackup(): BackupFile {
      const data: Record<string, unknown> = {};
      for (const key of DATA_KEYS) {
        const value = kv.get<unknown>(key, undefined);
        if (value !== undefined) data[key] = value;
      }
      return {
        schema_version: CURRENT_VERSION, exported_at: now().toISOString(), app_version: appVersion, data,
      };
    },
    /** Replaces all stored data. Throws BackupError and changes nothing when the file is not valid. */
    importBackup(raw: unknown): void {
      const check = validateBackup(raw);
      if (!check.ok) throw new BackupError(`BACKUP_INVALID: ${check.errors.join('; ')}`);
      let file: BackupFile;
      try {
        file = migrate(raw as Record<string, unknown>) as unknown as BackupFile;
      } catch (e) {
        throw new BackupError(`BACKUP_INVALID: ${(e as Error).message}`);
      }
      for (const key of DATA_KEYS) kv.remove(key);
      for (const [key, value] of Object.entries(file.data)) kv.set(key, value);
    },
    clearAll(): void {
      for (const key of kv.keys()) kv.remove(key);
    },
  };
}
