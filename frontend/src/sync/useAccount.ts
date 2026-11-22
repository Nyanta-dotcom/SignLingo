/** App-wide account store (one per page load), wired to the real Supabase API and the learner's local data. */

import { createAccountStore, type AccountStore } from './account';
import { getAuthApi } from './supabase';

/** The part of the learner store that sync needs (the real one is the Zustand store from `initLearner`). */
type Learner = {
  getState(): { backup: { readData(): Record<string, unknown>; applyData(d: Record<string, unknown>): void } };
  subscribe(listener: () => void): () => void;
};

const AUTO_SYNC_DELAY_MS = 5000;

let singleton: AccountStore | undefined;

/**
 * Call once at app start, after `initLearner`. With no Supabase configuration the status stays 'disabled' and nothing runs.
 * When signed in, progress is synced shortly after it changes (a lesson finishing), not on every state update.
 */
export function initAccount(learner: Learner): AccountStore {
  if (singleton) return singleton;
  singleton = createAccountStore({
    api: getAuthApi(),
    local: {
      readData: () => learner.getState().backup.readData(),
      applyData: (d) => learner.getState().backup.applyData(d),
    },
  });
  const store = singleton;
  let timer: ReturnType<typeof setTimeout> | undefined;
  learner.subscribe(() => {
    if (store.getState().status !== 'signed_in') return;
    clearTimeout(timer);
    timer = setTimeout(() => void store.getState().syncNow(), AUTO_SYNC_DELAY_MS);
  });
  void store.getState().start();
  return store;
}

/** Before `initAccount` (tests, or an app with sync switched off) the store is a disabled one, so the UI simply hides the account card. */
const disabled = createAccountStore({ api: null, local: { readData: () => ({}), applyData: () => {} } });

export function useAccount<T>(selector: (s: ReturnType<AccountStore['getState']>) => T): T {
  return (singleton ?? disabled)(selector);
}

/** The store itself, for calling actions from event handlers. */
export const accountStore = (): AccountStore => singleton ?? disabled;
