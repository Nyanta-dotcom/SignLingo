import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { initLearner } from '@/storage/useLearner';
import { AboutPage } from './AboutPage';

beforeAll(() => {
  initLearner({ heartThreshold: 0.6, appVersion: 'test' });
});

const show = () => render(<MemoryRouter initialEntries={['/about']}><AboutPage onStart={vi.fn()} /></MemoryRouter>);

describe('About & contact page', () => {
  it('lists the five team members with their student IDs and a responsibility each', () => {
    show();
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getAllByRole('cell')[1].textContent)).toEqual([
      '24090019', '24090003', '24090009', '24090028', '24090021',
    ]);
    expect(rows[0]).toHaveTextContent('Nguyễn Tuấn Hưng');
    expect(rows[0]).toHaveTextContent('Trưởng nhóm');
    for (const r of rows) expect(within(r).getAllByRole('cell')[2].textContent?.length).toBeGreaterThan(10);
  });

  it('gives the leader email and the source code link', () => {
    show();
    expect(screen.getByRole('link', { name: 'hung.nguyen240919@vnuk.udn.vn' })).toHaveAttribute('href', 'mailto:hung.nguyen240919@vnuk.udn.vn');
    expect(screen.getByRole('link', { name: /github\.com\/Nyanta-dotcom\/SignLingo/ })).toHaveAttribute('href', 'https://github.com/Nyanta-dotcom/SignLingo');
  });

  it('states that camera images never leave the browser', () => {
    show();
    expect(screen.getByRole('heading', { name: 'Quyền riêng tư' })).toBeInTheDocument();
    expect(screen.getByText(/không rời khỏi máy/)).toBeInTheDocument();
  });
});
