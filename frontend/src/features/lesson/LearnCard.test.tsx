import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Sign } from '@/content/types';
import { LearnCard } from './LearnCard';

const sign = (media?: Sign['media']): Sign => ({ code: 'LETTER_A', gloss: 'A', kind: 'static', model_task: 'static_letters', model_class_index: 0, media });

describe('LearnCard', () => {
  it('shows the letter and a clean hand picture without credit caption', () => {
    render(<LearnCard letter="A" sign={sign([{ type: 'image', src: '/media/letters/A.svg', license: 'Public domain', attribution: 'wpclipart.com' }])} onNext={() => {}} />);
    expect(screen.getByLabelText('Chữ cái cần học')).toHaveTextContent('A');
    const img = screen.getByRole('img', { name: 'Hình minh họa bàn tay làm chữ A' });
    expect(img).toHaveAttribute('src', '/media/letters/A.svg');
    expect(screen.queryByText(/wpclipart\.com/)).toBeNull();
  });

  it('works without a picture and moves on when asked', () => {
    const onNext = vi.fn();
    render(<LearnCard letter="B" sign={sign()} onNext={onNext} />);
    expect(screen.getByRole('img', { name: 'Hình minh họa bàn tay làm chữ B' }).tagName.toLowerCase()).toBe('svg');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it('ignores videos for now and falls back to the drawing', () => {
    render(<LearnCard letter="C" sign={sign([{ type: 'video', src: '/media/c.mp4', license: 'x', attribution: 'y' }])} onNext={() => {}} />);
    expect(screen.getByRole('img', { name: 'Hình minh họa bàn tay làm chữ C' }).tagName.toLowerCase()).toBe('svg');
  });
});
