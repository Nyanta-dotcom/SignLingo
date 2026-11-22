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
  const readData = (): Record<string, unknown> => {
    const data: Record<string, unknown> = {};
    for (const key of DATA_KEYS) {
      const value = kv.get<unknown>(key, undefined);
      if (value !== undefined) data[key] = value;
    }
    return data;
  };
  return {
    exportBackup(): BackupFile {
      return { schema_version: CURRENT_VERSION, exported_at: now().toISOString(), app_version: appVersion, data: readData() };
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
    /** The stored data as a plain object, without touching the backup reminder (used by account sync). */
    readData,
    /**
     * Writes only the given keys (account sync), leaving the other stored data (settings, sessions, benchmarks) as it is.
     * Throws BackupError and changes nothing when the data does not fit the backup schema.
     */
    applyData(data: Record<string, unknown>): void {
      const check = validateBackup({ schema_version: CURRENT_VERSION, exported_at: now().toISOString(), app_version: appVersion, data });
      if (!check.ok) throw new BackupError(`BACKUP_INVALID: ${check.errors.join('; ')}`);
      for (const [key, value] of Object.entries(data)) if ((DATA_KEYS as readonly string[]).includes(key)) kv.set(key, value);
    },
    clearAll(): void {
      for (const key of kv.keys()) kv.remove(key);
    },
  };
}
