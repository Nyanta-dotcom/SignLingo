import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { createAccountStore } from '@/sync/account';
import type { AccountUser, AuthApi } from '@/sync/supabase';
import { AccountMenu } from './AccountMenu';

const local = { readData: () => ({}), applyData: vi.fn() };

const setup = (user: AccountUser | null) => {
  const api = {
    getUser: vi.fn(async () => user),
    onChange: vi.fn(() => () => {}),
    signInWithGoogle: vi.fn(async () => {}),
    signInWithPassword: vi.fn(async () => {}),
    signUp: vi.fn(async () => ({ needsConfirmation: false })),
    signOut: vi.fn(async () => {}),
    deleteAccount: vi.fn(async () => {}),
    progressFor: vi.fn(() => ({ load: vi.fn(async () => null), save: vi.fn(async () => {}) })),
    leaderboardFor: vi.fn(),
  } satisfies AuthApi;
  const store = createAccountStore({ api, local });
  void store.getState().start();
  render(<MemoryRouter><AccountMenu store={store} /></MemoryRouter>);
  return { api, store };
};

describe('AccountMenu', () => {
  it('signed out: a link to the sign-in page', async () => {
    setup(null);
    expect(await screen.findByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
  });

  it('signed in: shows the account name, and its menu signs out', async () => {
    const { api, store } = setup({ id: 'u1', email: 'admin@example.com' });
    const button = await screen.findByRole('button', { name: /admin/ });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Hồ sơ' })).toHaveAttribute('href', '/profile');
    fireEvent.click(screen.getByRole('menuitem', { name: 'Đăng xuất' }));
    await waitFor(() => expect(api.signOut).toHaveBeenCalledOnce());
    await waitFor(() => expect(store.getState().status).toBe('signed_out'));
  });

  it('closes the menu with Escape', async () => {
    setup({ id: 'u1', email: 'admin@example.com' });
    fireEvent.click(await screen.findByRole('button', { name: /admin/ }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('renders nothing when accounts are not configured', () => {
    const store = createAccountStore({ api: null, local });
    const { container } = render(<MemoryRouter><AccountMenu store={store} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });
});
