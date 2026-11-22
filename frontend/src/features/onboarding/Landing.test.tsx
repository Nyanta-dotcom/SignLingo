import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initLearner } from '@/storage/useLearner';
import { FeaturesPage } from './FeaturesPage';
import { HowItWorksPage } from './HowItWorksPage';
import { Landing } from './Landing';

beforeAll(() => {
  initLearner({ heartThreshold: 0.6, appVersion: 'test' });
});

const show = (onStart = vi.fn(), initialPath = '/welcome') => {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/welcome" element={<Landing onStart={onStart} />} />
        <Route path="/features" element={<FeaturesPage onStart={onStart} />} />
        <Route path="/how-it-works" element={<HowItWorksPage onStart={onStart} />} />
        <Route path="/lab" element={<h1>AI Lab</h1>} />
      </Routes>
    </MemoryRouter>,
  );
  return onStart;
};

describe('Pre-app 3-page website', () => {
  it('introduces the app on Home, supports interactive letter preview, and states privacy', () => {
    show();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('SignLingo');
    expect(screen.getByText(/24 chữ cái tĩnh/)).toBeInTheDocument();
    expect(screen.getByText(/Không có ảnh hay video nào được gửi đi/)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Z' }));
    expect(screen.getByRole('img', { name: 'Minh họa bàn tay chữ Z' })).toHaveAttribute('src', '/media/letters/Z.svg');
  });

  it('starts when the learner presses Start and offers AI Lab', () => {
    const onStart = show();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu' }));
    expect(onStart).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Xem AI Lab' })).toHaveAttribute('href', '/lab');
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('navigates cleanly across all 3 pages (Trang chủ, Tính năng, Cách hoạt động)', () => {
    show();
    fireEvent.click(screen.getByRole('link', { name: 'Khám phá tính năng →' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Học bài bản theo lộ trình/);

    fireEvent.click(screen.getByRole('link', { name: 'Xem Cách hoạt động →' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/AI chạy hoàn toàn trong trình duyệt/);
    expect(screen.getByText(/Câu hỏi thường gặp/)).toBeInTheDocument();
  });
});
