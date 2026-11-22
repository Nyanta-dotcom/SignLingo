import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EyeIcon, EyeOffIcon } from '@/components/ui/Icons';
import { vi } from '@/i18n/vi';
import type { AccountStore } from '@/sync/account';
import { googleEnabled } from '@/sync/supabase';
import { accountStore } from '@/sync/useAccount';

const INPUT = 'min-h-11 w-full rounded-xl border-2 border-border bg-surface px-3 text-text focus-visible:border-brand-500';

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
  const [showPassword, setShowPassword] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (status === 'disabled') return null;
  const account = store.getState();
  const submit = (e: FormEvent) => { e.preventDefault(); void account.signInWithPassword(email.trim(), password); };

  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-lg font-black text-text">{t.title}</h2>
      {message && <p role="status" className={`text-sm font-bold ${message === 'confirm_email' ? 'text-text' : 'text-danger-on-bg'}`}>{t.messages[message]}</p>}
      {message === 'auth_failed' && detail && <p className="text-xs text-text-muted">{t.detail(detail)}</p>}

      {status === 'loading' && <p className="text-text-muted">{vi.common.loading}</p>}

      {status === 'signed_out' && (
        <>
          <p className="text-sm text-text-muted">{t.intro}</p>
          {google && (
            <>
              <Button variant="secondary" disabled={busy} onClick={() => void account.signInWithGoogle()}>{t.google}</Button>
              <p aria-hidden="true" className="text-center text-xs font-bold uppercase text-text-muted">{t.or}</p>
            </>
          )}
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-bold">
              {t.email}
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT} />
            </label>
            <div className="flex flex-col gap-1">
              <label htmlFor="account-password" className="text-sm font-bold">{t.password}</label>
              <div className="relative">
                <input
                  id="account-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required minLength={8}
                  value={password} onChange={(e) => setPassword(e.target.value)} className={`${INPUT} pr-12`}
                />
                <button
                  type="button" aria-label={showPassword ? t.hidePassword : t.showPassword} aria-pressed={showPassword}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-text-muted hover:text-text focus-visible:text-text"
                >
                  {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={busy}>{t.signIn}</Button>
              <Button variant="secondary" disabled={busy || !email || password.length < 8} onClick={() => void account.signUp(email.trim(), password)}>{t.signUp}</Button>
            </div>
          </form>
        </>
      )}

      {status === 'signed_in' && user && (
        <>
          <p className="font-bold">{t.signedInAs(user.email)}</p>
          <p role="status" className="text-sm text-text-muted">
            {sync === 'syncing' ? t.syncing : lastSyncAt ? t.synced(new Date(lastSyncAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })) : t.notSynced}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={sync === 'syncing'} onClick={() => void account.syncNow()}>{t.syncNow}</Button>
            <Button variant="secondary" disabled={busy} onClick={() => void account.signOut()}>{t.signOut}</Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(true)}>{t.deleteAccount}</Button>
          </div>
          {confirmDelete && (
            <div role="alertdialog" aria-label={t.deleteAccount} className="flex flex-col gap-3 rounded-[var(--radius-xl)] border-2 border-danger-fg p-4">
              <p className="font-bold">{t.deleteAsk}</p>
              <div className="flex gap-3">
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
