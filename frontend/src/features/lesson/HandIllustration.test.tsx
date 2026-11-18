import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HAND_LETTERS } from './handArt';
import { HandIllustration } from './HandIllustration';

describe('HandIllustration', () => {
  it('draws an image with a text alternative for every letter', () => {
    for (const letter of HAND_LETTERS) {
      const { unmount } = render(<HandIllustration letter={letter} />);
      const svg = screen.getByRole('img', { name: `Hình minh họa bàn tay làm chữ ${letter}` });
      expect(svg.querySelectorAll('path, rect, ellipse').length, letter).toBeGreaterThan(2);
      unmount();
    }
  });

  it('draws nothing for a letter without art (J, Z)', () => {
    const { container } = render(<HandIllustration letter="J" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('uses the colour tokens, never fixed colours', () => {
    const { container } = render(<HandIllustration letter="A" />);
    const colours = [...container.querySelectorAll('[stroke],[fill]')].flatMap((e) => [e.getAttribute('stroke'), e.getAttribute('fill')]).filter((c) => c && c !== 'none');
    expect(colours.every((c) => c?.startsWith('var(--'))).toBe(true);
  });
});
