import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { StatChip } from './StatChip';

describe('Button', () => {
  it('renders a real button that is not a submit by default and calls onClick', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Bắt đầu</Button>);
    const b = screen.getByRole('button', { name: 'Bắt đầu' });
    expect(b).toHaveAttribute('type', 'button');
    fireEvent.click(b);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it.each(['primary', 'secondary', 'success', 'danger', 'ghost'] as const)('variant %s renders', (variant) => {
    render(<Button variant={variant}>x</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('disabled and loading buttons do not fire clicks; loading is announced', () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button disabled onClick={onClick}>x</Button>);
    fireEvent.click(screen.getByRole('button'));
    rerender(<Button loading onClick={onClick}>x</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải');
  });

  it('asChild styles a link instead of nesting a button in it', () => {
    render(<Button asChild><a href="/learn">Học</a></Button>);
    expect(screen.getByRole('link', { name: 'Học' })).toHaveAttribute('href', '/learn');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('Card', () => {
  it('marks its variant', () => {
    render(<Card variant="selected">nội dung</Card>);
    expect(screen.getByText('nội dung')).toHaveAttribute('data-variant', 'selected');
  });
});

describe('ProgressBar', () => {
  it('exposes progressbar semantics and clamps the value', () => {
    const { rerender } = render(<ProgressBar value={4} max={10} label="Tiến độ bài học" />);
    const bar = screen.getByRole('progressbar', { name: 'Tiến độ bài học' });
    expect(bar).toHaveAttribute('aria-valuenow', '4');
    expect(bar).toHaveAttribute('aria-valuemax', '10');
    expect(bar.firstElementChild).toHaveStyle({ width: '40%' });
    rerender(<ProgressBar value={99} max={10} label="Tiến độ bài học" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '10');
  });
});

describe('StatChip', () => {
  it.each([['streak', 'ngày liên tiếp'], ['xp', 'điểm XP'], ['hearts', 'tim']] as const)('%s has a text label, not only an icon', (kind, label) => {
    render(<StatChip kind={kind} value={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
