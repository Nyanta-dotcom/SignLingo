import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initLearner } from '@/storage/useLearner';
import { AppRoutes } from './App';

let store: ReturnType<typeof initLearner>;
beforeAll(() => {
  store = initLearner({ heartThreshold: 0.6, appVersion: 'test' });
});
beforeEach(() => store.getState().backup.clearAll());

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

describe('AppRoutes', () => {
  it('shows the welcome page on the first visit and the learning dashboard after Start', () => {
    at('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('SignLingo');
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Học' })).toBeInTheDocument();
    expect(store.getState().onboarded).toBe(true);
  });

  it('keeps / on the welcome page on later visits and offers Continue to /learn', () => {
    store.getState().completeOnboarding();
    at('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('SignLingo');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục học' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Học' })).toBeInTheDocument();
  });

  it.each([['/practice', 'Luyện tự do'], ['/alphabet', 'Bảng chữ cái & Chữ số'], ['/dictionary', 'Bảng chữ cái & Chữ số'], ['/lab', 'AI Lab'], ['/profile', 'Hồ sơ']])('%s has a page', (path, title) => {
    at(path);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it('shows a not-found page for unknown paths, inside the shell', () => {
    at('/nope');
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument();
    expect(screen.getAllByRole('navigation')).toHaveLength(2);
  });

  it('renders settings in light-only mode without a dark theme toggle', () => {
    at('/settings');
    expect(screen.getByRole('heading', { level: 1, name: 'Cài đặt' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Tối' })).toBeNull();
  });
});
