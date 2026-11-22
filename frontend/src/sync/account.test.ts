import { describe, expect, it, vi } from 'vitest';
import { CURRENT_VERSION } from '@/storage/migrate';
import { createAccountStore } from './account';
import type { AccountUser, AuthApi } from './supabase';
import type { SavedProgress } from './syncProgress';

const USER: AccountUser = { id: 'u1', email: 'a@example.com' };
const stats = (xp: number) => ({ total_xp: xp, current_streak: 0, longest_streak: 0, last_goal_date: null, hearts: 5, hearts_updated_at: '2026-11-01T00:00:00Z' });

function fakeApi(over: Partial<AuthApi> & { saved?: SavedProgress | null } = {}) {
  let listener: (u: AccountUser | null) => void = () => {};
  const state = { saved: over.saved ?? null };
  const api = {
    getUser: vi.fn(async () => null as AccountUser | null),
    onChange: vi.fn((cb: (u: AccountUser | null) => void) => { listener = cb; return () => {}; }),
    signInWithGoogle: vi.fn(async () => {}),
    signInWithPassword: vi.fn(async () => {}),
    signUp: vi.fn(async () => ({ needsConfirmation: false })),
    signOut: vi.fn(async () => {}),
    deleteAccount: vi.fn(async () => {}),
    progressFor: vi.fn(() => ({
      load: vi.fn(async () => state.saved),
      save: vi.fn(async (s: SavedProgress) => { state.saved = s; }),
    })),
    ...over,
  };
  return { api: api as AuthApi & { progressFor: ReturnType<typeof vi.fn> }, state, emit: (u: AccountUser | null) => listener(u) };
}

const fakeLocal = (data: Record<string, unknown> = {}) => ({ data, readData: () => data, applyData: vi.fn() });
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('account store', () => {
  it('stays disabled, and does nothing, when Supabase is not configured', async () => {
    const store = createAccountStore({ api: null, local: fakeLocal() });
    await store.getState().start();
    expect(store.getState().status).toBe('disabled');
    await store.getState().syncNow();
    expect(store.getState().sync).toBe('idle');
  });

  it('starts signed out when there is no session', async () => {
    const { api } = fakeApi();
    const store = createAccountStore({ api, local: fakeLocal() });
    expect(store.getState().status).toBe('loading');
    await store.getState().start();
    expect(store.getState().status).toBe('signed_out');
  });

  it('with a saved session, signs in and syncs the progress right away', async () => {
    const { api } = fakeApi({ getUser: vi.fn(async () => USER) });
    const local = fakeLocal({ stats: stats(30) });
    const store = createAccountStore({ api, local, now: () => new Date('2026-11-22T10:00:00Z') });
    await store.getState().start();
    await flush();
    expect(store.getState()).toMatchObject({ status: 'signed_in', user: USER, sync: 'done', lastSyncAt: '2026-11-22T10:00:00.000Z' });
  });

  it('syncs when the auth state changes to signed in, and resets when it changes to signed out', async () => {
    const f = fakeApi();
    const store = createAccountStore({ api: f.api, local: fakeLocal({ stats: stats(5) }) });
    await store.getState().start();
    f.emit(USER);
    await flush();
    expect(store.getState().sync).toBe('done');
    expect(f.state.saved?.schema_version).toBe(CURRENT_VERSION);
    f.emit(null);
    expect(store.getState()).toMatchObject({ status: 'signed_out', user: null, sync: 'idle', lastSyncAt: null });
  });

  it('shows a message, and does not throw, when sign-in fails', async () => {
    const { api } = fakeApi({ signInWithPassword: vi.fn(async () => { throw new Error('Invalid login credentials'); }) });
    const store = createAccountStore({ api, local: fakeLocal() });
    await store.getState().start();
    await store.getState().signInWithPassword('a@example.com', 'wrong');
    expect(store.getState()).toMatchObject({ message: 'auth_failed', busy: false, status: 'signed_out' });
  });

  it('asks the user to confirm their email after sign-up when the project requires it', async () => {
    const { api } = fakeApi({ signUp: vi.fn(async () => ({ needsConfirmation: true })) });
    const store = createAccountStore({ api, local: fakeLocal() });
    await store.getState().signUp('a@example.com', 'secret-password');
    expect(store.getState().message).toBe('confirm_email');
  });

  it('reports a failed sync without losing the signed-in state', async () => {
    const f = fakeApi({ progressFor: vi.fn(() => ({ load: vi.fn(async () => { throw new Error('network'); }), save: vi.fn() })) });
    const store = createAccountStore({ api: f.api, local: fakeLocal() });
    await store.getState().start();
    f.emit(USER);
    await flush();
    expect(store.getState()).toMatchObject({ status: 'signed_in', sync: 'error', message: 'sync_failed' });
  });

  it('says the app is too old when the saved progress is newer', async () => {
    const f = fakeApi({ saved: { schema_version: CURRENT_VERSION + 1, data: {} } });
    const store = createAccountStore({ api: f.api, local: fakeLocal() });
    await store.getState().start();
    f.emit(USER);
    await flush();
    expect(store.getState().message).toBe('app_too_old');
  });

  it('does not run two syncs at once', async () => {
    const f = fakeApi({ getUser: vi.fn(async () => USER) });
    const store = createAccountStore({ api: f.api, local: fakeLocal({ stats: stats(1) }) });
    await store.getState().start();
    await Promise.all([store.getState().syncNow(), store.getState().syncNow(), store.getState().syncNow()]);
    await flush();
    expect(f.api.progressFor.mock.calls.length).toBeLessThanOrEqual(2);
  });

  it('signs out and deletes the account', async () => {
    const f = fakeApi({ getUser: vi.fn(async () => USER) });
    const store = createAccountStore({ api: f.api, local: fakeLocal() });
    await store.getState().start();
    await flush();
    await store.getState().signOut();
    expect(f.api.signOut).toHaveBeenCalled();
    expect(store.getState().status).toBe('signed_out');

    f.emit(USER);
    await flush();
    await store.getState().deleteAccount();
    expect(f.api.deleteAccount).toHaveBeenCalled();
    expect(store.getState().status).toBe('signed_out');
  });
});
