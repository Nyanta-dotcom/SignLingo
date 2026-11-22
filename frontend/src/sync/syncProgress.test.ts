import { describe, expect, it, vi } from 'vitest';
import { CURRENT_VERSION } from '@/storage/migrate';
import type { Stats } from '@/storage/types';
import { SyncError, syncProgress, type LocalProgress, type RemoteProgress, type SavedProgress } from './syncProgress';

const stats = (xp: number): Stats => ({ total_xp: xp, current_streak: 0, longest_streak: 0, last_goal_date: null, hearts: 5, hearts_updated_at: '2026-11-01T00:00:00Z' });

const fakeLocal = (data: Record<string, unknown>) => {
  const local = { data, readData: () => local.data, applyData: vi.fn((d: Record<string, unknown>) => { local.data = { ...local.data, ...d }; }) };
  return local satisfies LocalProgress & { data: Record<string, unknown> };
};
const fakeRemote = (saved: SavedProgress | null) => {
  const remote = { saved, load: vi.fn(async () => remote.saved), save: vi.fn(async (s: SavedProgress) => { remote.saved = s; }) };
  return remote satisfies RemoteProgress & { saved: SavedProgress | null };
};

describe('syncProgress', () => {
  it('first sign-in with progress on the device and nothing saved: uploads only', async () => {
    const local = fakeLocal({ stats: stats(40), settings: { theme: 'dark' } });
    const remote = fakeRemote(null);
    expect(await syncProgress(local, remote)).toEqual({ downloaded: false, uploaded: true });
    expect(remote.save).toHaveBeenCalledWith({ schema_version: CURRENT_VERSION, data: { stats: stats(40) } });
    expect(local.applyData).not.toHaveBeenCalled();
  });

  it('new device with an empty store: downloads only', async () => {
    const local = fakeLocal({});
    const remote = fakeRemote({ schema_version: CURRENT_VERSION, data: { stats: stats(90) } });
    expect(await syncProgress(local, remote)).toEqual({ downloaded: true, uploaded: false });
    expect(local.data.stats).toEqual(stats(90));
    expect(remote.save).not.toHaveBeenCalled();
  });

  it('both sides have progress: merges, and both end up equal', async () => {
    const local = fakeLocal({ stats: stats(50), progress: { L1: { status: 'completed', best_accuracy_pct: 90, times_completed: 1, last_completed_at: null } } });
    const remote = fakeRemote({ schema_version: CURRENT_VERSION, data: { stats: stats(80), progress: { L2: { status: 'completed', best_accuracy_pct: 70, times_completed: 1, last_completed_at: null } } } });
    expect(await syncProgress(local, remote)).toEqual({ downloaded: true, uploaded: true });
    expect(Object.keys((local.data.progress as object))).toEqual(['L1', 'L2']);
    expect((local.data.stats as Stats).total_xp).toBe(80);
    expect(remote.saved?.data).toEqual({ stats: local.data.stats, progress: local.data.progress });
  });

  it('is a no-op when both sides already agree (no needless writes)', async () => {
    const same = { stats: stats(10) };
    const local = fakeLocal(same);
    const remote = fakeRemote({ schema_version: CURRENT_VERSION, data: same });
    expect(await syncProgress(local, remote)).toEqual({ downloaded: false, uploaded: false });
    expect(remote.save).not.toHaveBeenCalled();
    expect(local.applyData).not.toHaveBeenCalled();
  });

  it('refuses saved progress written by a newer app and changes nothing', async () => {
    const local = fakeLocal({ stats: stats(1) });
    const remote = fakeRemote({ schema_version: CURRENT_VERSION + 1, data: { stats: stats(99) } });
    await expect(syncProgress(local, remote)).rejects.toMatchObject({ code: 'APP_TOO_OLD' });
    expect(remote.save).not.toHaveBeenCalled();
    expect(local.applyData).not.toHaveBeenCalled();
  });

  it('reports saved progress that does not fit the schema, without uploading', async () => {
    const local = fakeLocal({});
    local.applyData.mockImplementation(() => { throw new Error('BACKUP_INVALID: /stats total_xp must be >= 0'); });
    const remote = fakeRemote({ schema_version: CURRENT_VERSION, data: { stats: stats(-5) } });
    await expect(syncProgress(local, remote)).rejects.toBeInstanceOf(SyncError);
    expect(remote.save).not.toHaveBeenCalled();
  });

  it('runs twice in a row without writing the second time', async () => {
    const local = fakeLocal({ stats: stats(5) });
    const remote = fakeRemote({ schema_version: CURRENT_VERSION, data: { stats: stats(9) } });
    await syncProgress(local, remote);
    remote.save.mockClear();
    expect(await syncProgress(local, remote)).toEqual({ downloaded: false, uploaded: false });
  });
});
