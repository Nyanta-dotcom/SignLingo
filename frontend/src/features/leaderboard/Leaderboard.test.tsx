import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { LeaderboardApi, LeaderboardRow } from '@/sync/supabase';
import { Leaderboard } from './Leaderboard';

const row = (rank: number, name: string, score: number, extra: Partial<LeaderboardRow> = {}): LeaderboardRow => ({ rank, name, score, detail: null, me: false, ...extra });

const fakeApi = (rows: LeaderboardRow[] = []) => {
  const top = vi.fn(async () => rows);
  return { top, api: { top, loadMine: vi.fn(), join: vi.fn(), leave: vi.fn() } as unknown as LeaderboardApi };
};

const show = (api: LeaderboardApi | null) => render(<MemoryRouter><Leaderboard api={api} labels={['A', 'B']} /></MemoryRouter>);

describe('Leaderboard', () => {
  it('without an account configured it says so and asks for nothing from the server', () => {
    show(null);
    expect(screen.getByText(/chưa bật phần tài khoản/)).toBeInTheDocument();
  });

  it('signed out: asks to sign in and links to the sign-in page', () => {
    render(<MemoryRouter><Leaderboard api={null} labels={['A']} status="signed_out" /></MemoryRouter>);
    expect(screen.getByText('Đăng nhập để xem bảng xếp hạng.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Đăng nhập' })).toHaveAttribute('href', '/login');
  });

  it('shows the weekly ranking first, with the learner highlighted', async () => {
    const { api, top } = fakeApi([row(1, 'Lan', 320), row(2, 'Minh', 150, { me: true })]);
    show(api);
    expect(await screen.findByText('320 XP')).toBeInTheDocument();
    expect(screen.getByText('Bạn')).toBeInTheDocument();
    expect(top).toHaveBeenCalledWith('week', undefined);
  });

  it('switches boards and formats each score', async () => {
    const { api, top } = fakeApi([row(1, 'Lan', 12)]);
    show(api);
    fireEvent.click(screen.getByRole('tab', { name: 'Chuỗi ngày' }));
    expect(await screen.findByText('12 ngày')).toBeInTheDocument();
    expect(top).toHaveBeenLastCalledWith('streak', undefined);
  });

  it('accuracy: overall first, then a single letter, showing how many attempts back the percentage', async () => {
    const { api, top } = fakeApi([row(1, 'Lan', 96.5, { detail: 40 })]);
    show(api);
    fireEvent.click(screen.getByRole('tab', { name: 'Độ chính xác' }));
    expect(await screen.findByText('96.5%')).toBeInTheDocument();
    expect(screen.getByText('40 lượt thử')).toBeInTheDocument();
    expect(top).toHaveBeenLastCalledWith('accuracy', undefined);
    fireEvent.change(screen.getByLabelText('Xếp theo chữ'), { target: { value: 'B' } });
    await waitFor(() => expect(top).toHaveBeenLastCalledWith('letter', 'B'));
  });

  it('shows an empty message, and a retry when loading fails', async () => {
    const { api, top } = fakeApi([]);
    show(api);
    expect(await screen.findByText('Chưa có ai trên bảng này.')).toBeInTheDocument();
    top.mockRejectedValueOnce(new Error('network'));
    fireEvent.click(screen.getByRole('tab', { name: 'Tổng XP' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Chưa có ai trên bảng này.')).toBeInTheDocument();
  });
});
