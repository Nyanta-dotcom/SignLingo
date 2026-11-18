import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initLearner } from '@/storage/useLearner';
import { Profile } from './Profile';

let store: ReturnType<typeof initLearner>;
beforeAll(() => {
  store = initLearner({ heartThreshold: 0.6, appVersion: 'test' });
});
beforeEach(() => {
  store.getState().backup.clearAll();
  store.getState().refresh();
});

const show = () => render(<MemoryRouter><Profile labels={['A', 'B', 'C']} /></MemoryRouter>);
const attempt = (expected: string, result: 'correct' | 'timed_out') => ({
  item_order: 1, position: null, expected, predicted: result === 'correct' ? expected : null,
  confidence: result === 'correct' ? 0.9 : null, result, time_to_verify_ms: 900, retries: 0, confused_with: null,
});

describe('Profile', () => {
  it('starts empty: anonymous learner, zero stats, a hint instead of mastery', () => {
    show();
    expect(screen.getByText('Người học')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ảnh đại diện' })).toHaveTextContent('?');
    expect(screen.getByText('Chưa có lượt luyện nào. Hãy học một bài để thấy tiến bộ ở đây.')).toBeInTheDocument();
    expect(screen.getByText('0 ngày có hoạt động trong 12 tuần qua')).toBeInTheDocument();
  });

  it('shows the initial of the display name and a link to settings', () => {
    store.getState().setDisplayName('lan');
    show();
    expect(screen.getByRole('img', { name: 'Ảnh đại diện' })).toHaveTextContent('L');
    expect(screen.getByRole('link', { name: 'Cài đặt' })).toHaveAttribute('href', '/settings');
  });

  it('reflects a finished session: XP, today in the heatmap and per-letter mastery', () => {
    const a = store.getState();
    const s = a.startSession({ mode: 'lesson', lesson_code: 'L1', model: { model_id: 'm', version: '1' } });
    a.recordAttempt(s.id, attempt('A', 'correct'));
    a.recordAttempt(s.id, attempt('B', 'timed_out'));
    a.completeSession(s.id, { xpReward: 25 });
    show();
    const xp = store.getState().stats.total_xp;
    expect(xp).toBeGreaterThan(0);
    expect(screen.getByText('Tổng XP').nextElementSibling).toHaveTextContent(String(xp));
    expect(screen.getByText('1 ngày có hoạt động trong 12 tuần qua')).toBeInTheDocument();
    const heat = screen.getByRole('img', { name: /Biểu đồ nhiệt/ });
    expect(heat.querySelectorAll('[data-level]')).toHaveLength(84);
    expect(heat.querySelectorAll('[data-level]:not([data-level="0"])')).toHaveLength(1);
    const list = screen.getByRole('list');
    expect(within(list).getByLabelText('Chữ A: 100% đúng trong 1 lượt')).toBeInTheDocument();
    expect(within(list).getByLabelText('Chữ B: 0% đúng trong 1 lượt')).toBeInTheDocument();
    expect(within(list).getByLabelText('C: chưa luyện')).toBeInTheDocument();
  });
});
