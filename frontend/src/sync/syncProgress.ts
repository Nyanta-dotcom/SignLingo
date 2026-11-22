/**
 * One round of account sync: read the saved progress, merge it with this device's, write back whichever side changed.
 * Knows nothing about Supabase: it works on two small interfaces so it can be tested with plain objects.
 */

import { CURRENT_VERSION } from '@/storage/migrate';
import { mergeProgress, pickSynced, sameProgress, type SyncData } from './merge';

export type SavedProgress = { schema_version: number; data: SyncData };

/** The account's saved progress (null when the account has none yet). */
export type RemoteProgress = {
  load(): Promise<SavedProgress | null>;
  save(saved: SavedProgress): Promise<void>;
};

/** This device's stored data. */
export type LocalProgress = {
  readData(): Record<string, unknown>;
  applyData(data: Record<string, unknown>): void;
};

export type SyncResult = { downloaded: boolean; uploaded: boolean };

export class SyncError extends Error {
  constructor(readonly code: 'APP_TOO_OLD' | 'REMOTE_INVALID', message: string) {
    super(message);
  }
}

export async function syncProgress(local: LocalProgress, remote: RemoteProgress): Promise<SyncResult> {
  const saved = await remote.load();
  if (saved && saved.schema_version > CURRENT_VERSION) {
    throw new SyncError('APP_TOO_OLD', `saved progress is version ${saved.schema_version}, this app reads up to ${CURRENT_VERSION}`);
  }
  const mine = pickSynced(local.readData());
  const merged = mergeProgress(mine, saved?.data ?? {});

  const downloaded = !sameProgress(merged, mine);
  if (downloaded) {
    try {
      local.applyData(merged);
    } catch (e) {
      throw new SyncError('REMOTE_INVALID', (e as Error).message);
    }
  }
  const uploaded = !saved || !sameProgress(merged, saved.data);
  if (uploaded) await remote.save({ schema_version: CURRENT_VERSION, data: merged });
  return { downloaded, uploaded };
}
