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

/** Pages after the welcome screen are lazy-loaded, so they appear after a tick. */
const LAZY = { timeout: 5000 };

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );

describe('AppRoutes', () => {
  it('shows the welcome page on the first visit and the learning dashboard after Start', async () => {
    at('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('SignLingo');
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Học' }, LAZY)).toBeInTheDocument();
    expect(store.getState().onboarded).toBe(true);
  });

  it('keeps / on the welcome page on later visits and offers Continue to /learn', async () => {
    store.getState().completeOnboarding();
    at('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('SignLingo');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục học' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Học' }, LAZY)).toBeInTheDocument();
  });

  it.each([['/practice', 'Luyện tự do'], ['/alphabet', 'Bảng chữ cái & Chữ số'], ['/dictionary', 'Bảng chữ cái & Chữ số'], ['/lab', 'AI Lab'], ['/profile', 'Hồ sơ']])('%s has a page', async (path, title) => {
    at(path);
    expect(await screen.findByRole('heading', { level: 1, name: title }, LAZY)).toBeInTheDocument();
  });

  it('shows a not-found page for unknown paths, inside the shell', async () => {
    at('/nope');
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy trang' }, LAZY)).toBeInTheDocument();
    expect(screen.getAllByRole('navigation')).toHaveLength(2);
  });

  it('renders settings in light-only mode without a dark theme toggle', async () => {
    at('/settings');
    expect(await screen.findByRole('heading', { level: 1, name: 'Cài đặt' }, LAZY)).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Tối' })).toBeNull();
  });
});
