import { render, screen } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initLearner } from '@/storage/useLearner';
import type { SessionRecord } from '@/storage/types';
import { LessonResult } from './LessonResult';

let store: ReturnType<typeof initLearner>;
beforeAll(() => {
  store = initLearner({ heartThreshold: 0.6, appVersion: 'test' });
});
beforeEach(() => store.getState().backup.clearAll());

const attempt = (expected: string, result: 'correct' | 'timed_out') => ({
  item_order: 1, position: null, expected, predicted: null, confidence: null, result, time_to_verify_ms: null, retries: 0, confused_with: null,
});
const record = (over: Partial<SessionRecord> = {}): SessionRecord => ({
  id: 'r', mode: 'lesson', lesson_code: 'L1', model: { model_id: 'm', version: '1' }, started_at: '2026-03-01T10:00:00Z',
  completed_at: '2026-03-01T10:02:05Z', status: 'completed', accuracy_pct: 75, xp_awarded: 18, hearts_lost: 1,
  attempts: [attempt('S', 'timed_out'), attempt('A', 'correct'), attempt('S', 'timed_out'), attempt('M', 'timed_out')], perf: null, ...over,
});
const show = (r = record(), onRetry = vi.fn(), onFinish = vi.fn()) => {
  render(<LessonResult result={{ record: r, streakFrom: 0 }} onFinish={onFinish} onRetry={onRetry} />);
  return { onRetry, onFinish };
};

describe('LessonResult', () => {
  it('shows XP, accuracy and the time taken', () => {
    show();
    expect(screen.getByRole('heading', { name: 'Hoàn thành bài học!' })).toBeInTheDocument();
    expect(screen.getByText('XP').nextElementSibling).toHaveAttribute('aria-label', '18');
    expect(screen.getByText('Chính xác').nextElementSibling).toHaveTextContent('75%');
    expect(screen.getByText('Thời gian').nextElementSibling).toHaveTextContent('2:05');
  });

  it('lists the missed letters, most misses first, with a way to review them', () => {
    const { onRetry } = show();
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['S (2 lần)', 'M (1 lần)']);
    screen.getByRole('button', { name: 'Ôn lại' }).click();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('has no review list when nothing was missed, and the finish button continues', () => {
    const { onFinish } = show(record({ attempts: [attempt('A', 'correct')] }));
    expect(screen.queryByText('Chữ cần ôn lại')).toBeNull();
    screen.getByRole('button', { name: 'Tiếp tục' }).click();
    expect(onFinish).toHaveBeenCalledOnce();
  });

  it('shows the streak change only when the streak went up', () => {
    show();
    expect(screen.queryByTestId('streak')).toBeNull();
    store.getState().updateSettings({});
  });

  it('draws confetti, but not when the learner asked for reduced motion', () => {
    const { unmount } = render(<LessonResult result={{ record: record(), streakFrom: 0 }} onFinish={() => {}} onRetry={() => {}} />);
    expect(screen.getByTestId('confetti')).toBeInTheDocument();
    unmount();
    store.getState().updateSettings({ reduced_motion: 'on' });
    render(<LessonResult result={{ record: record(), streakFrom: 0 }} onFinish={() => {}} onRetry={() => {}} />);
    expect(screen.queryByTestId('confetti')).toBeNull();
    expect(screen.getByText('XP').nextElementSibling).toHaveTextContent('18');
  });
});
