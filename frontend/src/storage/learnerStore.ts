/** Learner state over the KV adapter (docs/03 §3.2): settings, stats, progress, daily, sign_stats. */

import { applyHeartRegen } from '@/game/hearts';
import { readStreak } from '@/game/streak';
import type { KV } from './kv';
import type { DailyActivity, LessonProgress, Profile, Settings, SignStat, Stats } from './types';

export type Clock = () => Date;

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system', handedness: 'right', sound_on: true, reduced_motion: 'system', daily_xp_goal: 20,
};

export function createLearnerStore(kv: KV, clock: Clock = () => new Date()) {
  const getProfile = (): Profile => {
    const stored = kv.get<Profile | null>('profile', null);
    if (stored) return stored;
    const profile = {
      created_at: clock().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
    kv.set('profile', profile);
    return profile;
  };

  const getStats = (): Stats => {
    const stored = kv.get<Stats>('stats', {
      total_xp: 0, current_streak: 0, longest_streak: 0, last_goal_date: null,
      hearts: 5, hearts_updated_at: clock().toISOString(),
    });
    const now = clock();
    return readStreak(applyHeartRegen(stored, now.getTime()), now, getProfile().timezone);
  };

  return {
    kv,
    now: clock,
    timezone: () => getProfile().timezone,
    getProfile,
    updateProfile(patch: Pick<Profile, 'display_name'>): Profile {
      const name = patch.display_name?.trim();
      const { display_name: _old, ...rest } = getProfile();
      void _old;
      const next: Profile = name ? { ...rest, display_name: name.slice(0, 30) } : rest;
      kv.set('profile', next);
      return next;
    },
    getSettings: (): Settings => ({ ...DEFAULT_SETTINGS, ...kv.get<Partial<Settings>>('settings', {}) }),
    updateSettings(patch: Partial<Settings>): Settings {
      const next = { ...this.getSettings(), ...patch };
      kv.set('settings', next);
      return next;
    },
    getStats,
    saveStats: (s: Stats) => kv.set('stats', s),
    getProgress: () => kv.get<Record<string, LessonProgress>>('progress', {}),
    saveProgress: (p: Record<string, LessonProgress>) => kv.set('progress', p),
    getDaily: () => kv.get<Record<string, DailyActivity>>('daily', {}),
    saveDaily: (d: Record<string, DailyActivity>) => kv.set('daily', d),
    getSignStats: () => kv.get<Record<string, SignStat>>('sign_stats', {}),
    saveSignStats: (s: Record<string, SignStat>) => kv.set('sign_stats', s),
  };
}

export type LearnerStore = ReturnType<typeof createLearnerStore>;
