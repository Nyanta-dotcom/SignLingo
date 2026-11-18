import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initLearner } from '@/storage/useLearner';
import { AppRoutes } from './App';

beforeAll(() => {
  initLearner({ heartThreshold: 0.6, appVersion: 'test' }); // not returned: vitest would call it as a teardown
});
beforeEach(() => localStorage.clear());

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

describe('AppRoutes', () => {
  it('sends / to the learning dashboard', () => {
    at('/');
    expect(screen.getByRole('heading', { level: 1, name: 'Học' })).toBeInTheDocument();
  });

  it.each([['/practice', 'Luyện tự do'], ['/dictionary', 'Từ điển'], ['/lab', 'AI Lab'], ['/profile', 'Hồ sơ']])('%s has a page', (path, title) => {
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
