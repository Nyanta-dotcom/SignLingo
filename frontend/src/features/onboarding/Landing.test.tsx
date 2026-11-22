import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initLearner } from '@/storage/useLearner';
import { Landing } from './Landing';

beforeAll(() => {
  initLearner({ heartThreshold: 0.6, appVersion: 'test' });
});

const show = (onStart = vi.fn()) => {
  render(<MemoryRouter><Landing onStart={onStart} /></MemoryRouter>);
  return onStart;
};

describe('Landing', () => {
  it('introduces the app, says what is supported and that nothing leaves the device', () => {
    show();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('SignLingo AI');
    expect(screen.getByText(/24 chữ cái tĩnh/)).toBeInTheDocument();
    expect(screen.getByText(/Không có ảnh hay video nào được gửi đi/)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('starts when the learner presses Start and offers the AI Lab without a theme switch', () => {
    const onStart = show();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(onStart).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Xem AI Lab' })).toHaveAttribute('href', '/lab');
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });
});
