import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AppShell, NAV_ITEMS } from './AppShell';

const stats = { streak: 4, xp: 340, hearts: 5 };
const renderAt = (path: string, loginLink = false) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppShell stats={stats} loginLink={loginLink} />}>
          <Route path="/learn" element={<p>trang học</p>} />
          <Route path="/lab" element={<p>trang lab</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );

describe('AppShell', () => {
  it('offers a sign-in link in the top bar only when asked (signed out)', () => {
    renderAt('/learn', true);
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
  });

  it('has no sign-in link by default', () => {
    renderAt('/learn');
    expect(screen.queryByRole('link', { name: 'Đăng nhập' })).toBeNull();
  });

  it('shows the five tabs in the sidebar and in the bottom navigation', () => {
    renderAt('/learn');
    expect(NAV_ITEMS).toHaveLength(6);
    for (const nav of screen.getAllByRole('navigation')) {
      for (const item of NAV_ITEMS) expect(within(nav).getByRole('link', { name: item.label })).toHaveAttribute('href', item.to);
    }
    expect(screen.getAllByRole('navigation')).toHaveLength(2);
  });

  it('marks only the current tab with aria-current=page', () => {
    renderAt('/lab');
    const current = screen.getAllByRole('link', { current: 'page' });
    expect(current.length).toBeGreaterThan(0);
    for (const link of current) expect(link).toHaveAccessibleName('AI Lab');
  });

  it('renders the routed page and the stat chips with text labels', () => {
    renderAt('/learn');
    expect(screen.getByText('trang học')).toBeInTheDocument();
    expect(screen.getByText('340')).toBeInTheDocument();
    expect(screen.getByText('điểm XP')).toBeInTheDocument();
  });

  it('has a main landmark and a skip link for keyboard users', () => {
    renderAt('/learn');
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /bỏ qua/i })).toHaveAttribute('href', '#main');
  });
});
