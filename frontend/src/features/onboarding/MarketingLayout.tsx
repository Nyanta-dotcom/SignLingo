import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { AmbientBackdrop } from '@/components/ui/AmbientBackdrop';
import { Button } from '@/components/ui/Button';
import { BrandMark, PlayIcon } from '@/components/ui/Icons';
import { vi } from '@/i18n/vi';
import { AccountMenu } from '@/features/account/AccountMenu';
import { useAccount } from '@/sync/useAccount';

const PAGES = [
  { to: '/welcome', label: 'Trang chủ' },
  { to: '/features', label: 'Tính năng' },
  { to: '/how-it-works', label: 'Cách hoạt động' },
  { to: '/about', label: 'Giới thiệu & Liên hệ', short: 'Liên hệ' },
] as { to: string; label: string; short?: string }[];

type Props = {
  onStart: () => void;
  activeHome?: boolean;
  children: ReactNode;
};

/** Shared 3-page pre-app marketing shell: themed ASL backdrop + frosted navbar + animated content + clean footer. */
export function MarketingLayout({ onStart, activeHome = false, children }: Props) {
  const { pathname } = useLocation();
  const hasAccount = useAccount((s) => s.status === 'signed_in' || s.status === 'signed_out');
  return (
    <div className="hero-backdrop relative flex min-h-dvh flex-col bg-bg text-text">
      <AmbientBackdrop variant="marketing" />

      <header className="sticky top-0 z-30 border-b-2 border-border/80 bg-surface/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/welcome" aria-label={vi.appName} className="group flex items-center gap-2.5 rounded-2xl">
            <BrandMark className="size-9 transition-transform duration-(--motion-bounce) group-hover:-rotate-6 group-hover:scale-110" />
            <span className={`text-xl font-black tracking-tight text-brand-fg ${hasAccount ? 'hidden sm:inline' : ''}`}>{vi.appName}</span>
          </Link>

          <nav aria-label="Điều hướng giới thiệu" className="hidden items-center gap-1 rounded-full border-2 border-border bg-surface-2/80 p-1 md:flex">
            {PAGES.map((p) => (
              <NavLink
                key={p.to}
                to={p.to}
                className={({ isActive }) => {
                  const current = isActive || (activeHome && p.to === '/welcome');
                  return `rounded-full px-4 py-1.5 text-sm font-extrabold transition-[background-color,color,transform] duration-(--motion-fast) ${
                    current ? 'btn-pink text-ink-on-pink shadow-none' : 'text-text-muted hover:bg-brand-50 hover:text-brand-fg'
                  }`;
                }}
              >
                {p.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2.5">
            <AccountMenu />
            <Button size="sm" onClick={onStart} className="whitespace-nowrap">
              <PlayIcon className="size-3.5" />
              Vào học
            </Button>
          </div>
        </div>

        {/* Compact mobile 3-page switcher */}
        <nav aria-label="Điều hướng giới thiệu di động" className="flex items-center justify-center gap-1 border-t border-border/70 px-3 py-2 md:hidden">
          {PAGES.map((p) => (
            <NavLink
              key={p.to}
              to={p.to}
              className={({ isActive }) => {
                const current = isActive || (activeHome && p.to === '/welcome');
                return `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold transition-colors ${
                  current ? 'btn-pink text-ink-on-pink shadow-none' : 'text-text-muted hover:bg-brand-50 hover:text-brand-fg'
                }`;
              }}
            >
              {p.short ?? p.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main key={pathname} className="page-enter relative z-10 flex-1">
        {children}
      </main>

      <footer className="relative z-10 border-t-2 border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            <BrandMark className="size-8" />
            <span className="font-black text-brand-fg">{vi.appName}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-5 font-bold text-text-muted">
            {PAGES.map((p) => (
              <Link key={p.to} to={p.to} className="transition-colors hover:text-brand-fg">{p.label}</Link>
            ))}
            <Link to="/lab" className="transition-colors hover:text-brand-fg">AI Lab</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
