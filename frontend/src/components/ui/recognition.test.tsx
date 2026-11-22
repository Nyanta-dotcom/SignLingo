import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HoldRing } from './HoldRing';
import { PredictionBars } from './PredictionBars';

describe('HoldRing', () => {
  it('exposes progress as a progressbar and clamps it', () => {
    const { rerender } = render(<HoldRing progress={0.42} label="Giữ chữ">C</HoldRing>);
    expect(screen.getByRole('progressbar', { name: 'Giữ chữ' })).toHaveAttribute('aria-valuenow', '42');
    expect(screen.getByText('C')).toBeInTheDocument();
    rerender(<HoldRing progress={3} label="Giữ chữ" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('marks itself full at 100% (the colour changes to success)', () => {
    const { rerender } = render(<HoldRing progress={0.99} label="x" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-full', 'false');
    rerender(<HoldRing progress={1} label="x" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('data-full', 'true');
  });
});

describe('PredictionBars', () => {
  const items = [{ label: 'C', p: 0.84 }, { label: 'O', p: 0.09 }, { label: 'E', p: 0.03 }];
  it('lists every item with its letter and percentage as text', () => {
    render(<PredictionBars items={items} caption="Top 3" />);
    const list = screen.getByRole('list', { name: 'Top 3' });
    const rows = within(list).getAllByRole('listitem');
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent('C');
    expect(rows[0]).toHaveTextContent('84%');
    expect(rows[2]).toHaveTextContent('3%');
  });
  it('highlights the most likely letter even when the list is in A-Z order', () => {
    render(<PredictionBars items={[{ label: 'A', p: 0.01 }, { label: 'E', p: 0.86 }, { label: 'F', p: 0.02 }]} caption="Tất cả" />);
    const rows = screen.getAllByRole('listitem');
    expect(rows.map((r) => r.dataset.top)).toEqual([undefined, 'true', undefined]);
  });
  it('renders an empty list without crashing', () => {
    render(<PredictionBars items={[]} caption="Top 3" />);
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
