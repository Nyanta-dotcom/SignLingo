import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { UserIcon } from '@/components/ui/Icons';
import { vi } from '@/i18n/vi';
import type { AccountStore } from '@/sync/account';
import { accountStore } from '@/sync/useAccount';

const CHIP = 'inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border-2 border-brand-300 bg-brand-50 px-2.5 text-sm font-extrabold text-brand-fg transition-colors hover:bg-brand-100';
const ITEM = 'flex min-h-11 w-full cursor-pointer items-center rounded-xl px-3 text-left font-bold text-text transition-colors hover:bg-brand-50 hover:text-brand-fg';

/** Top-bar account control: "Đăng nhập" while signed out; the account name with a sign-out menu once signed in. */
export function AccountMenu({ store = accountStore() }: { store?: AccountStore }) {
  const t = vi.login;
  const status = store((s) => s.status);
  const user = store((s) => s.user);
  const busy = store((s) => s.busy);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown); };
  }, [open]);

  if (status === 'signed_out') {
    return (
      <Link to="/login" aria-label={t.title} className={CHIP}>
        <UserIcon className="size-5" />
        <span className="hidden whitespace-nowrap sm:inline">{t.title}</span>
      </Link>
    );
  }
  if (status !== 'signed_in' || !user) return null;

  const name = user.email.split('@')[0];
  return (
    <div ref={box} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={t.menu(name)} onClick={() => setOpen((v) => !v)} className={`${CHIP} cursor-pointer`}>
        <span aria-hidden="true" className="flex size-6 items-center justify-center rounded-full bg-brand-400 text-xs uppercase text-ink-on-pink">{name[0]}</span>
        <span className="hidden max-w-32 truncate sm:inline">{name}</span>
      </button>
      {open && (
        <div role="menu" aria-label={t.menu(name)} className="absolute right-0 top-full z-40 mt-2 flex w-60 flex-col gap-1 rounded-2xl border-2 border-border bg-surface p-2 shadow-(--card-shadow)">
          <p className="truncate px-3 py-2 text-sm font-bold text-text-muted">{user.email}</p>
          <Link to="/profile" role="menuitem" className={ITEM} onClick={() => setOpen(false)}>{vi.nav.profile}</Link>
          <button type="button" role="menuitem" disabled={busy} className={`${ITEM} text-danger-on-bg`} onClick={() => { setOpen(false); void store.getState().signOut(); }}>
            {vi.account.signOut}
          </button>
        </div>
      )}
    </div>
  );
}
