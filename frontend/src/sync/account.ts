/**
 * Account state for the UI: who is signed in and how the last sync went. A Zustand store over `AuthApi` and the
 * learner's local data. Signing in is optional: with no account, or no configuration, the app behaves as before.
 */

import { create } from 'zustand';
import type { AccountUser, AuthApi } from './supabase';
import { syncProgress, SyncError, type LocalProgress } from './syncProgress';

export type Status = 'disabled' | 'loading' | 'signed_out' | 'signed_in';
export type SyncState = 'idle' | 'syncing' | 'done' | 'error';

type State = {
  status: Status;
  user: AccountUser | null;
  sync: SyncState;
  lastSyncAt: string | null;
  /** A short, user-facing code for the last failure or notice; the UI maps it to text. */
  message: 'confirm_email' | 'sync_failed' | 'app_too_old' | 'auth_failed' | null;
  busy: boolean;
  start(): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUp(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  syncNow(): Promise<void>;
};

type Options = {
  api: AuthApi | null;
  local: LocalProgress;
  now?: () => Date;
};

export function createAccountStore({ api, local, now = () => new Date() }: Options) {
  return create<State>((set, get) => {
    let unsubscribe: (() => void) | undefined;
    let syncing = false;

    const settle = (user: AccountUser | null) => {
      set({ user, status: user ? 'signed_in' : 'signed_out', ...(user ? {} : { sync: 'idle', lastSyncAt: null }) });
      if (user) void get().syncNow();
    };

    /** Runs a sign-in style call; a failure shows a message instead of throwing into the UI. */
    const attempt = async (run: () => Promise<void>) => {
      set({ busy: true, message: null });
      try {
        await run();
      } catch {
        set({ message: 'auth_failed' });
      } finally {
        set({ busy: false });
      }
    };

    return {
      status: api ? 'loading' : 'disabled',
      user: null,
      sync: 'idle',
      lastSyncAt: null,
      message: null,
      busy: false,

      async start() {
        if (!api || unsubscribe) return;
        unsubscribe = api.onChange((user) => {
          if (user?.id !== get().user?.id) settle(user);
        });
        try {
          settle(await api.getUser());
        } catch {
          set({ status: 'signed_out' });
        }
      },

      signInWithGoogle: () => attempt(() => api!.signInWithGoogle()),
      signInWithPassword: (email, password) => attempt(() => api!.signInWithPassword(email, password)),
      signUp: (email, password) =>
        attempt(async () => {
          const { needsConfirmation } = await api!.signUp(email, password);
          if (needsConfirmation) set({ message: 'confirm_email' });
        }),

      async signOut() {
        await attempt(() => api!.signOut());
        if (get().message !== 'auth_failed') settle(null);
      },

      async deleteAccount() {
        await attempt(() => api!.deleteAccount());
        if (get().message !== 'auth_failed') settle(null);
      },

      async syncNow() {
        const user = get().user;
        if (!api || !user || syncing) return;
        syncing = true;
        set({ sync: 'syncing', message: null });
        try {
          await syncProgress(local, api.progressFor(user.id));
          set({ sync: 'done', lastSyncAt: now().toISOString() });
        } catch (e) {
          set({ sync: 'error', message: e instanceof SyncError && e.code === 'APP_TOO_OLD' ? 'app_too_old' : 'sync_failed' });
        } finally {
          syncing = false;
        }
      },
    };
  });
}

export type AccountStore = ReturnType<typeof createAccountStore>;
