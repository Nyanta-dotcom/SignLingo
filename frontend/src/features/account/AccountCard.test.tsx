import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createAccountStore } from '@/sync/account';
import type { AccountUser, AuthApi } from '@/sync/supabase';
import { AccountCard } from './AccountCard';

const USER: AccountUser = { id: 'u1', email: 'an@example.com' };

const setup = (over: Partial<AuthApi> = {}, user: AccountUser | null = null) => {
  const api = {
    getUser: vi.fn(async () => user),
    onChange: vi.fn(() => () => {}),
    signInWithGoogle: vi.fn(async () => {}),
    signInWithPassword: vi.fn(async () => {}),
    signUp: vi.fn(async () => ({ needsConfirmation: true })),
    signOut: vi.fn(async () => {}),
    deleteAccount: vi.fn(async () => {}),
    progressFor: vi.fn(() => ({ load: vi.fn(async () => null), save: vi.fn(async () => {}) })),
    ...over,
  } satisfies AuthApi;
  const store = createAccountStore({ api, local: { readData: () => ({}), applyData: vi.fn() } });
  void store.getState().start();
  return { api, store, ...render(<AccountCard store={store} />) };
};

describe('AccountCard', () => {
  it('renders nothing when sync is not configured', () => {
    const { container } = render(<AccountCard store={createAccountStore({ api: null, local: { readData: () => ({}), applyData: vi.fn() } })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('signed out: offers Google and email sign-in and says what is stored', async () => {
    setup();
    expect(await screen.findByRole('button', { name: 'Tiếp tục với Google' })).toBeInTheDocument();
    expect(screen.getByText(/không bao giờ rời máy bạn/)).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('signs in with email and password', async () => {
    const { api } = setup();
    await screen.findByRole('button', { name: 'Đăng nhập' });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'an@example.com' } });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/), { target: { value: 'secret-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));
    await waitFor(() => expect(api.signInWithPassword).toHaveBeenCalledWith('an@example.com', 'secret-pass'));
  });

  it('sign up asks to confirm the email', async () => {
    setup();
    await screen.findByRole('button', { name: 'Đăng ký' });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'an@example.com' } });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/), { target: { value: 'secret-pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng ký' }));
    expect(await screen.findByText(/xác nhận tài khoản/)).toBeInTheDocument();
  });

  it('sign up stays disabled until the email and an 8-character password are filled', async () => {
    setup();
    const signUp = await screen.findByRole('button', { name: 'Đăng ký' });
    expect(signUp).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'an@example.com' } });
    fireEvent.change(screen.getByLabelText(/Mật khẩu/), { target: { value: 'short' } });
    expect(signUp).toBeDisabled();
  });

  it('signed in: shows the account, syncs and can sign out', async () => {
    const { api } = setup({}, USER);
    expect(await screen.findByText('Đã đăng nhập: an@example.com')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Đã đồng bộ lúc/)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await waitFor(() => expect(api.signOut).toHaveBeenCalled());
    expect(await screen.findByRole('button', { name: 'Tiếp tục với Google' })).toBeInTheDocument();
  });

  it('deleting the account needs a confirmation and says it cannot be undone', async () => {
    const { api } = setup({}, USER);
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa tài khoản' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Không thể hoàn tác');
    expect(api.deleteAccount).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa vĩnh viễn' }));
    await waitFor(() => expect(api.deleteAccount).toHaveBeenCalled());
  });

  it('keeping the account closes the confirmation without deleting', async () => {
    const { api } = setup({}, USER);
    fireEvent.click(await screen.findByRole('button', { name: 'Xóa tài khoản' }));
    fireEvent.click(screen.getByRole('button', { name: 'Giữ lại' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(api.deleteAccount).not.toHaveBeenCalled();
  });
});
