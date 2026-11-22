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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('SignLingo AI');
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(screen.getByRole('heading', { level: 1, name: 'Học' })).toBeInTheDocument();
    expect(store.getState().onboarded).toBe(true);
  });

  it('sends / straight to the learning dashboard on later visits', () => {
    store.getState().completeOnboarding();
    at('/');
    expect(screen.queryByRole('button', { name: 'Bắt đầu' })).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: 'Học' })).toBeInTheDocument();
  });

  it.each([['/practice', 'Luyện tự do'], ['/alphabet', 'Bảng chữ cái'], ['/dictionary', 'Bảng chữ cái'], ['/lab', 'AI Lab'], ['/profile', 'Hồ sơ']])('%s has a page', (path, title) => {
    at(path);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it('shows a not-found page for unknown paths, inside the shell', () => {
    at('/nope');
    expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument();
    expect(screen.getAllByRole('navigation')).toHaveLength(2);
  });

  it('the settings page switches the theme and remembers it', () => {
    at('/settings');
    fireEvent.click(screen.getByRole('radio', { name: 'Tối' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(JSON.parse(localStorage.getItem('signlingo:v1:settings') ?? '{}').theme).toBe('dark');
  });
});
