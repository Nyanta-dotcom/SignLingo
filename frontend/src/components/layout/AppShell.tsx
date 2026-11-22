import type { ComponentType, ReactNode, SVGProps } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { vi } from '@/i18n/vi';
import { AmbientBackdrop } from '@/components/ui/AmbientBackdrop';
import { AlphabetIcon, BrandMark, HandIcon, HomeIcon, LabIcon, TrophyIcon, UserIcon } from '@/components/ui/Icons';
import { StatChip } from '@/components/ui/StatChip';

type NavItem = {
  to: string;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { to: '/learn', label: vi.nav.learn, Icon: HomeIcon },
  { to: '/practice', label: vi.nav.practice, Icon: HandIcon },
  { to: '/alphabet', label: vi.nav.alphabet, Icon: AlphabetIcon },
  { to: '/leaderboard', label: vi.nav.leaderboard, Icon: TrophyIcon },
  { to: '/lab', label: vi.nav.lab, Icon: LabIcon },
  { to: '/profile', label: vi.nav.profile, Icon: UserIcon },
];

type Stats = { streak: number; xp: number; hearts: number };

function SidebarNav() {
  return (
    <ul className="flex flex-col gap-1.5">
      {NAV_ITEMS.map(({ to, label, Icon }) => (
        <li key={to}>
          <NavLink
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              `group flex min-h-12 items-center gap-3.5 rounded-2xl border-2 px-3.5 py-2 text-sm font-extrabold uppercase tracking-wide transition-[background-color,border-color,color,transform] duration-(--motion-fast) ${
                isActive
                  ? 'border-brand-200 bg-brand-50 text-brand-fg shadow-[0_2px_0_var(--brand-200)]'
                  : 'border-transparent text-text-muted hover:bg-surface-2 hover:text-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-(--motion-fast) ${
                    isActive ? 'btn-pink text-ink-on-pink shadow-none' : 'bg-surface-2 text-text-muted group-hover:bg-brand-100 group-hover:text-brand-fg'
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Floating pill bottom dock on mobile, inspired by the rounded active-pink dock in the reference UI. */
function BottomNav() {
  return (
    <ul className="flex items-center justify-around gap-1">
      {NAV_ITEMS.map(({ to, label, Icon }) => (
        <li key={to} className="min-w-0 flex-1">
          <NavLink
            to={to}
            aria-label={label}
            className={({ isActive }) =>
              `flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full px-0.5 py-1 text-[11px] font-extrabold transition-colors duration-(--motion-fast) ${
                isActive ? 'text-brand-fg' : 'text-text-muted hover:text-text'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex size-9 items-center justify-center rounded-full transition-[background-color,transform] duration-(--motion-fast) ${
                    isActive ? 'btn-pink text-ink-on-pink shadow-none' : 'bg-transparent'
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="max-w-full truncate">{label}</span>
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Desktop: crisp white Duolingo sidebar + themed ASL backdrop + sticky stat bar. Mobile: top bar + floating pill dock. */
export function AppShell({ stats, banner, loginLink = false }: { stats: Stats; banner?: ReactNode; loginLink?: boolean }) {
  const { pathname } = useLocation();
  return (
    <div className="relative min-h-dvh bg-bg text-text md:grid md:grid-cols-[16.5rem_1fr]">
      <AmbientBackdrop variant="app" />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:border-2 focus:border-brand-300 focus:bg-surface focus:px-4 focus:py-2.5 focus:font-extrabold focus:text-brand-fg"
      >
        {vi.nav.skip}
      </a>
      <nav aria-label={vi.nav.sidebar} className="sticky top-0 z-20 hidden h-dvh flex-col border-r-2 border-border bg-surface/95 px-4 py-6 backdrop-blur-md md:flex">
        <Link to="/" className="group mb-7 flex items-center gap-3 rounded-2xl px-2 py-1">
          <BrandMark className="size-10 transition-transform duration-(--motion-bounce) group-hover:-rotate-6 group-hover:scale-110" />
          <span className="text-xl font-black tracking-tight text-brand-fg">{vi.appName}</span>
        </Link>
        <SidebarNav />
        <div className="mt-auto border-t border-border/70 pt-3">
          <Link
            to="/welcome"
            className="flex min-h-10 items-center justify-center rounded-2xl px-3 text-xs font-extrabold text-text-muted transition-colors hover:bg-brand-50 hover:text-brand-fg"
          >
            ← Trang giới thiệu
          </Link>
        </div>
      </nav>
      <div className="relative z-10 flex min-h-dvh flex-col pb-24 md:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b-2 border-border/80 bg-surface/85 px-4 py-2.5 backdrop-blur-xl md:justify-end md:px-8">
          <Link to="/" className="flex items-center gap-2 md:hidden">
            <BrandMark className="size-8" />
            <span className={`text-lg font-black tracking-tight text-brand-fg ${loginLink ? 'hidden sm:inline' : ''}`}>{vi.appName}</span>
          </Link>
          <div className="flex items-center gap-2">
            {loginLink && (
              <Link
                to="/login" aria-label={vi.login.title}
                className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-full border-2 border-brand-300 bg-brand-50 px-2.5 text-sm font-extrabold text-brand-fg transition-colors hover:bg-brand-100"
              >
                <UserIcon className="size-5" />
                <span className="hidden sm:inline">{vi.login.title}</span>
              </Link>
            )}
            <StatChip kind="streak" value={stats.streak} />
            <StatChip kind="xp" value={stats.xp} />
            <StatChip kind="hearts" value={stats.hearts} />
          </div>
        </header>
        {banner}
        <main id="main" className="flex-1 p-4 md:p-8">
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
      <nav
        aria-label={vi.nav.bottom}
        className="fixed inset-x-3 bottom-3 z-30 mx-auto max-w-md rounded-full border-2 border-border bg-surface/95 px-2 py-1.5 shadow-(--nav-pill-shadow) backdrop-blur-xl md:hidden"
      >
        <BottomNav />
      </nav>
    </div>
  );
}
