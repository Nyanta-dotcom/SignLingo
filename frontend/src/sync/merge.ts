/**
 * Merging the progress on this device with the progress saved in the account (docs ADR "accounts and sync").
 * Pure functions over the plain backup `data` objects. The rule everywhere: never lose progress, so when two devices
 * disagree the merged value is the one that shows more progress. Settings and benchmarks stay on the device.
 */

import type { DailyActivity, LessonProgress, Profile, SignStat, Stats } from '@/storage/types';

export type SyncData = {
  profile?: Profile;
  stats?: Stats;
  progress?: Record<string, LessonProgress>;
  daily?: Record<string, DailyActivity>;
  sign_stats?: Record<string, SignStat>;
  [other: string]: unknown;
};

/** The parts of the backup that follow the account. Everything else (settings, sessions, benchmarks) is per device. */
export const SYNCED_KEYS = ['profile', 'stats', 'progress', 'daily', 'sign_stats'] as const;

const later = (a?: string | null, b?: string | null) => ((a ?? '') >= (b ?? '') ? a : b) ?? null;

function mergeMap<T>(a: Record<string, T> | undefined, b: Record<string, T> | undefined, pick: (x: T, y: T) => T) {
  const out: Record<string, T> = { ...(a ?? {}) };
  for (const [k, v] of Object.entries(b ?? {})) out[k] = k in out ? pick(out[k], v) : v;
  return out;
}

export const mergeLesson = (x: LessonProgress, y: LessonProgress): LessonProgress => ({
  status: x.status === 'completed' || y.status === 'completed' ? 'completed' : 'in_progress',
  best_accuracy_pct: Math.max(x.best_accuracy_pct, y.best_accuracy_pct),
  times_completed: Math.max(x.times_completed, y.times_completed),
  last_completed_at: later(x.last_completed_at, y.last_completed_at),
});

export const mergeDay = (x: DailyActivity, y: DailyActivity): DailyActivity => ({
  xp_earned: Math.max(x.xp_earned, y.xp_earned),
  lessons_completed: Math.max(x.lessons_completed, y.lessons_completed),
  goal_met: x.goal_met || y.goal_met,
});

export function mergeStats(x: Stats, y: Stats): Stats {
  const newerGoal = (x.last_goal_date ?? '') >= (y.last_goal_date ?? '') ? x : y;
  const newerHearts = x.hearts_updated_at >= y.hearts_updated_at ? x : y;
  return {
    ...x,
    total_xp: Math.max(x.total_xp, y.total_xp),
    longest_streak: Math.max(x.longest_streak, y.longest_streak),
    current_streak: newerGoal.current_streak,
    last_goal_date: newerGoal.last_goal_date,
    hearts: newerHearts.hearts,
    hearts_updated_at: newerHearts.hearts_updated_at,
  };
}

export function mergeProfile(local: Profile, remote: Profile): Profile {
  return {
    created_at: local.created_at <= remote.created_at ? local.created_at : remote.created_at,
    timezone: local.timezone,
    ...((local.display_name ?? remote.display_name) ? { display_name: local.display_name ?? remote.display_name } : {}),
  };
}

/** Merged progress of `local` and `remote`; each side may be missing (a new device, or an account with no save yet). */
export function mergeProgress(local: SyncData, remote: SyncData): SyncData {
  const out: SyncData = {};
  const stats = local.stats && remote.stats ? mergeStats(local.stats, remote.stats) : (local.stats ?? remote.stats);
  const profile = local.profile && remote.profile ? mergeProfile(local.profile, remote.profile) : (local.profile ?? remote.profile);
  if (profile) out.profile = profile;
  if (stats) out.stats = stats;
  const progress = mergeMap(local.progress, remote.progress, mergeLesson);
  const daily = mergeMap(local.daily, remote.daily, mergeDay);
  const signStats = mergeMap(local.sign_stats, remote.sign_stats, (x, y) => (y.attempts > x.attempts ? y : x));
  if (Object.keys(progress).length) out.progress = progress;
  if (Object.keys(daily).length) out.daily = daily;
  if (Object.keys(signStats).length) out.sign_stats = signStats;
  return out;
}

/** The synced slice of a backup's `data`, ready to upload. */
export function pickSynced(data: Record<string, unknown>): SyncData {
  return Object.fromEntries(SYNCED_KEYS.filter((k) => data[k] !== undefined).map((k) => [k, data[k]])) as SyncData;
}

/** True when the two saves hold the same progress, so nothing needs to be written. */
export const sameProgress = (a: SyncData, b: SyncData) => JSON.stringify(pickSynced(a)) === JSON.stringify(pickSynced(b));
