import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { LeaderboardApi, LeaderboardEntry } from '@/sync/supabase';
import { JoinCard } from './JoinCard';

const setup = (mine: LeaderboardEntry | null = null, over: Partial<LeaderboardApi> = {}) => {
  const api = {
    loadMine: vi.fn(async () => mine), join: vi.fn(async () => {}), leave: vi.fn(async () => {}), top: vi.fn(),
    ...over,
  } as unknown as LeaderboardApi;
  const beforeJoin = vi.fn(async () => {});
  render(<MemoryRouter><JoinCard api={api} beforeJoin={beforeJoin} /></MemoryRouter>);
  return { api, beforeJoin };
};

describe('JoinCard', () => {
  it('renders nothing when signed out', () => {
    const { container } = render(<MemoryRouter><JoinCard api={null} /></MemoryRouter>);
    expect(container).toBeEmptyDOMElement();
  });

  it('says that nobody sees the learner until they join', async () => {
    setup();
    expect(await screen.findByText(/Mặc định bạn không xuất hiện/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rời bảng xếp hạng' })).toBeNull();
  });

  it('syncs first, then joins with the cleaned name', async () => {
    const { api, beforeJoin } = setup();
    fireEvent.change(screen.getByLabelText(/Tên hiển thị/), { target: { value: '  Minh   Anh ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tham gia' }));
    await waitFor(() => expect(api.join).toHaveBeenCalledWith('Minh Anh'));
    expect(beforeJoin).toHaveBeenCalledOnce();
    expect(await screen.findByRole('button', { name: 'Rời bảng xếp hạng' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Minh Anh');
  });

  it('refuses a name that is too short and does not call the server', async () => {
    const { api } = setup();
    fireEvent.change(screen.getByLabelText(/Tên hiển thị/), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tham gia' }));
    expect(await screen.findByRole('status')).toHaveTextContent('2 đến 24');
    expect(api.join).not.toHaveBeenCalled();
  });

  it('shows the current state for someone who already joined, and lets them leave', async () => {
    const { api } = setup({ display_name: 'Lan', show_on_leaderboard: true });
    fireEvent.click(await screen.findByRole('button', { name: 'Rời bảng xếp hạng' }));
    await waitFor(() => expect(api.leave).toHaveBeenCalledOnce());
    expect(await screen.findByText(/không còn hiện/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rời bảng xếp hạng' })).toBeNull();
  });

  it('reports a failure without claiming the learner joined', async () => {
    setup(null, { join: vi.fn(async () => { throw new Error('rls'); }) } as Partial<LeaderboardApi>);
    fireEvent.change(screen.getByLabelText(/Tên hiển thị/), { target: { value: 'Lan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tham gia' }));
    expect(await screen.findByText('Chưa lưu được. Hãy thử lại sau.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rời bảng xếp hạng' })).toBeNull();
  });
});
