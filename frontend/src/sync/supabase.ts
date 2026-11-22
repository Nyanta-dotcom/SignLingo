/**
 * The only file that talks to Supabase (accounts and saved progress). Everything else uses the small `AuthApi`
 * interface, so the rest of the app and its tests never need the network.
 * The URL and the public `anon` key come from Vite env vars; both are safe in the browser because Row Level Security
 * (supabase/migrations/0001_init.sql) decides who may read what. The `service_role` key must never appear here.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RemoteProgress, SavedProgress } from './syncProgress';

export type AccountUser = { id: string; email: string };

export type LeaderboardKind = 'week' | 'total' | 'streak' | 'accuracy' | 'letter';
/** One line of the ranking. `score` is XP, days or a percentage; `detail` is the number of attempts for the accuracy boards. */
export type LeaderboardRow = { rank: number; name: string; score: number; detail: number | null; me: boolean };
export type LeaderboardEntry = { display_name: string; show_on_leaderboard: boolean };

/** The signed-in person's own leaderboard entry, and the ranking. Nobody appears unless they chose to join. */
export type LeaderboardApi = {
  loadMine(): Promise<LeaderboardEntry | null>;
  join(displayName: string): Promise<void>;
  leave(): Promise<void>;
  top(kind: LeaderboardKind, letter?: string): Promise<LeaderboardRow[]>;
};

export type AuthApi = {
  getUser(): Promise<AccountUser | null>;
  /** Calls back on sign-in, sign-out and token refresh; returns the unsubscribe function. */
  onChange(cb: (user: AccountUser | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signInWithPassword(email: string, password: string): Promise<void>;
  /** `needsConfirmation` is true when the user must click the link in an email before signing in. */
  signUp(email: string, password: string): Promise<{ needsConfirmation: boolean }>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  progressFor(userId: string): RemoteProgress;
  leaderboardFor(userId: string): LeaderboardApi;
};

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Google sign-in needs its own setup in Supabase and Google Cloud; the button shows only when the owner says it is ready. */
export const googleEnabled = import.meta.env.VITE_SUPABASE_GOOGLE === 'true';

/** False until the project owner sets both env vars; the app then hides the account card and stays fully local. */
export const syncConfigured = Boolean(url && anonKey);

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

const toUser = (u: { id: string; email?: string } | null | undefined): AccountUser | null => (u ? { id: u.id, email: u.email ?? '' } : null);

export function createSupabaseAuth(client: SupabaseClient): AuthApi {
  return {
    async getUser() {
      const { data } = await client.auth.getSession();
      return toUser(data.session?.user);
    },
    onChange(cb) {
      const { data } = client.auth.onAuthStateChange((_event, session) => cb(toUser(session?.user)));
      return () => data.subscription.unsubscribe();
    },
    async signInWithGoogle() {
      fail((await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/profile' } })).error);
    },
    async signInWithPassword(email, password) {
      fail((await client.auth.signInWithPassword({ email, password })).error);
    },
    async signUp(email, password) {
      const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + '/profile' } });
      fail(error);
      return { needsConfirmation: !data.session };
    },
    async signOut() {
      fail((await client.auth.signOut()).error);
    },
    async deleteAccount() {
      fail((await client.rpc('delete_my_account')).error);
      await client.auth.signOut();
    },
    progressFor(userId) {
      return {
        async load(): Promise<SavedProgress | null> {
          const { data, error } = await client.from('user_backups').select('schema_version, data').eq('user_id', userId).maybeSingle();
          fail(error);
          return data ? { schema_version: data.schema_version as number, data: data.data as SavedProgress['data'] } : null;
        },
        async save(saved) {
          fail((await client.from('user_backups').upsert({
            user_id: userId, schema_version: saved.schema_version, data: saved.data, updated_at: new Date().toISOString(),
          })).error);
        },
      };
    },
    leaderboardFor(userId) {
      return {
        async loadMine() {
          const { data, error } = await client.from('public_profiles').select('display_name, show_on_leaderboard').eq('user_id', userId).maybeSingle();
          fail(error);
          return data ? { display_name: data.display_name as string, show_on_leaderboard: data.show_on_leaderboard as boolean } : null;
        },
        async join(displayName) {
          // Not an upsert: its "on conflict" step would also rewrite user_id, which a client may not update (see 0001 grants).
          const updated = await client.from('public_profiles').update({ display_name: displayName, show_on_leaderboard: true }).eq('user_id', userId).select('user_id');
          fail(updated.error);
          if (updated.data?.length) return;
          fail((await client.from('public_profiles').insert({ user_id: userId, display_name: displayName, show_on_leaderboard: true })).error);
        },
        async leave() {
          fail((await client.from('public_profiles').update({ show_on_leaderboard: false }).eq('user_id', userId)).error);
        },
        async top(kind, letter) {
          const { data, error } = await client.rpc('get_leaderboard', { p_kind: kind, p_letter: letter ?? null, p_limit: 50 });
          fail(error);
          return ((data ?? []) as Array<{ rank_no: number; shown_name: string; score: number; detail: number | null; is_me: boolean }>).map((r) => ({
            rank: Number(r.rank_no), name: r.shown_name, score: Number(r.score), detail: r.detail === null ? null : Number(r.detail), me: r.is_me,
          }));
        },
      };
    },
  };
}

let auth: AuthApi | null | undefined;

/** The real Supabase-backed API, or null when the project is not configured. Created on first use. */
export function getAuthApi(): AuthApi | null {
  if (auth !== undefined) return auth;
  auth = syncConfigured ? createSupabaseAuth(createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })) : null;
  return auth;
}
