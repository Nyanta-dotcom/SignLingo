/**
 * The only file that talks to Supabase (accounts and saved progress). Everything else uses the small `AuthApi`
 * interface, so the rest of the app and its tests never need the network.
 * The URL and the public `anon` key come from Vite env vars; both are safe in the browser because Row Level Security
 * (supabase/migrations/0001_init.sql) decides who may read what. The `service_role` key must never appear here.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RemoteProgress, SavedProgress } from './syncProgress';

export type AccountUser = { id: string; email: string };

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
};

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

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
  };
}

let auth: AuthApi | null | undefined;

/** The real Supabase-backed API, or null when the project is not configured. Created on first use. */
export function getAuthApi(): AuthApi | null {
  if (auth !== undefined) return auth;
  auth = syncConfigured ? createSupabaseAuth(createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })) : null;
  return auth;
}
