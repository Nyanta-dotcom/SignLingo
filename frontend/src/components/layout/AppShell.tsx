import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router';
import { vi } from '@/i18n/vi';
import { StatChip } from '@/components/ui/StatChip';

export const NAV_ITEMS = [
  { to: '/learn', label: vi.nav.learn, icon: '🏠' },
  { to: '/practice', label: vi.nav.practice, icon: '🖐' },
  { to: '/dictionary', label: vi.nav.dictionary, icon: '📖' },
  { to: '/lab', label: vi.nav.lab, icon: '🧪' },
  { to: '/profile', label: vi.nav.profile, icon: '👤' },
] as const;

type Stats = { streak: number; xp: number; hearts: number };

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center gap-3 rounded-xl px-4 font-extrabold ${
    isActive ? 'bg-brand-100 text-brand-700 dark:bg-surface-2 dark:text-brand-300' : 'text-text-muted hover:bg-surface-2'
  }`;

function NavList({ vertical }: { vertical: boolean }) {
  return (
    <ul className={vertical ? 'flex flex-col gap-1' : 'flex justify-around'}>
      {NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} className={linkClass} aria-label={item.label}>
            <span aria-hidden="true">{item.icon}</span>
            <span className={vertical ? '' : 'sr-only'}>{item.label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** Desktop: sidebar + content + stat bar. Mobile: stat bar on top, bottom navigation (docs/05 §4). */
export function AppShell({ stats, banner }: { stats: Stats; banner?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg text-text md:grid md:grid-cols-[16rem_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:p-3">
        {vi.nav.skip}
      </a>
      <nav aria-label={vi.nav.sidebar} className="hidden border-r-2 border-border bg-surface p-4 md:block">
        <p className="mb-6 px-4 text-2xl font-extrabold text-brand-fg">{vi.appName}</p>
        <NavList vertical />
      </nav>
      <div className="flex min-h-dvh flex-col pb-20 md:pb-0">
        <header className="flex items-center justify-end gap-1 border-b-2 border-border bg-surface px-4">
          <StatChip kind="streak" value={stats.streak} />
          <StatChip kind="xp" value={stats.xp} />
          <StatChip kind="hearts" value={stats.hearts} />
        </header>
        {banner}
        <main id="main" className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
      <nav aria-label={vi.nav.bottom} className="fixed inset-x-0 bottom-0 border-t-2 border-border bg-surface p-2 md:hidden">
        <NavList vertical={false} />
      </nav>
    </div>
  );
}
