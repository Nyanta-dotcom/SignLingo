import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ShieldLockIcon, SparkleIcon } from '@/components/ui/Icons';
import { vi } from '@/i18n/vi';
import type { AccountStore } from '@/sync/account';
import { googleEnabled } from '@/sync/supabase';
import { accountStore } from '@/sync/useAccount';

const INPUT = 'min-h-12 w-full rounded-2xl border-2 border-border bg-surface px-4 text-base font-bold text-text transition-colors hover:border-brand-300 focus:border-brand-500';

/** Optional account: sign in to keep progress across devices. Renders nothing when sync is not configured. */
export function AccountCard({ store = accountStore(), google = googleEnabled }: { store?: AccountStore; google?: boolean }) {
  const t = vi.account;
  const status = store((s) => s.status);
  const user = store((s) => s.user);
  const sync = store((s) => s.sync);
  const lastSyncAt = store((s) => s.lastSyncAt);
  const message = store((s) => s.message);
  const detail = store((s) => s.detail);
  const busy = store((s) => s.busy);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (status === 'disabled') return null;
  const account = store.getState();
  const submit = (e: FormEvent) => { e.preventDefault(); void account.signInWithPassword(email.trim(), password); };

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-brand-100 text-brand-fg">
            <ShieldLockIcon className="size-5" />
          </span>
          <h2 className="text-lg font-black text-text">{t.title}</h2>
        </div>
        {status === 'signed_in' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-3 py-1 text-xs font-extrabold text-success-fg">
            <SparkleIcon className="size-3.5" />
            Đám mây
          </span>
        )}
      </div>

      {message && (
        <p
          role="status"
          className={`rounded-2xl px-4 py-2.5 text-sm font-bold ${
            message === 'confirm_email' ? 'bg-brand-50 text-brand-fg' : 'bg-danger-bg/70 text-danger-on-bg'
          }`}
        >
          {t.messages[message]}
        </p>
      )}
      {message === 'auth_failed' && detail && <p className="text-xs font-bold text-text-muted">{t.detail(detail)}</p>}

      {status === 'loading' && <p className="text-text-muted">{vi.common.loading}</p>}

      {status === 'signed_out' && (
        <>
          <p className="text-sm leading-relaxed text-text-muted">{t.intro}</p>
          {google && (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => void account.signInWithGoogle()}>{t.google}</Button>
              <div aria-hidden="true" className="flex items-center gap-3 text-xs font-extrabold uppercase tracking-wider text-text-muted before:h-0.5 before:flex-1 before:bg-border after:h-0.5 after:flex-1 after:bg-border">
                {t.or}
              </div>
            </>
          )}
          <form onSubmit={submit} className="flex flex-col gap-3.5">
            <label className="flex flex-col gap-1.5 text-sm font-extrabold text-text">
              {t.email}
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-extrabold text-text">
              {t.password}
              <input type="password" autoComplete="current-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
            </label>
            <div className="flex flex-wrap gap-3 pt-1">
              <Button type="submit" disabled={busy}>{t.signIn}</Button>
              <Button variant="secondary" disabled={busy || !email || password.length < 8} onClick={() => void account.signUp(email.trim(), password)}>{t.signUp}</Button>
            </div>
          </form>
        </>
      )}

      {status === 'signed_in' && user && (
        <>
          <div className="flex flex-col gap-1 rounded-2xl border border-border bg-surface-2/60 px-4 py-3">
            <p className="font-extrabold text-text">{t.signedInAs(user.email)}</p>
            <p role="status" className="text-sm font-bold text-text-muted">
              {sync === 'syncing' ? t.syncing : lastSyncAt ? t.synced(new Date(lastSyncAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })) : t.notSynced}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button disabled={sync === 'syncing'} onClick={() => void account.syncNow()}>{t.syncNow}</Button>
            <Button variant="secondary" disabled={busy} onClick={() => void account.signOut()}>{t.signOut}</Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>{t.deleteAccount}</Button>
          </div>
          {confirmDelete && (
            <div role="alertdialog" aria-label={t.deleteAccount} className="flex flex-col gap-3 rounded-2xl border-2 border-danger-fg bg-danger-bg/40 p-4">
              <p className="font-bold text-text">{t.deleteAsk}</p>
              <div className="flex flex-wrap gap-3">
                <Button variant="danger" disabled={busy} onClick={() => { void account.deleteAccount(); setConfirmDelete(false); }}>{t.deleteYes}</Button>
                <Button variant="secondary" onClick={() => setConfirmDelete(false)}>{t.deleteNo}</Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
