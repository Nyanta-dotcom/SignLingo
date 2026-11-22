import { useMemo } from 'react';
import { useAccount } from './useAccount';
import { getAuthApi, type LeaderboardApi } from './supabase';

/** The leaderboard API for the signed-in person, or null when signed out or when sync is not configured. */
export function useLeaderboardApi(): LeaderboardApi | null {
  const userId = useAccount((s) => s.user?.id);
  return useMemo(() => (userId ? getAuthApi()?.leaderboardFor(userId) ?? null : null), [userId]);
}
