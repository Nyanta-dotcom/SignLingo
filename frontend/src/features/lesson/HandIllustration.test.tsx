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

  it('draws nothing for an unknown letter', () => {
    const { container } = render(<HandIllustration letter="?" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('uses the colour tokens, never fixed colours', () => {
    for (const letter of ['A', 'J', 'Z']) {
      const { container, unmount } = render(<HandIllustration letter={letter} />);
      const colours = [...container.querySelectorAll('[stroke],[fill]')].flatMap((e) => [e.getAttribute('stroke'), e.getAttribute('fill')]).filter((c) => c && c !== 'none');
      expect(colours.every((c) => c?.startsWith('var(--')), letter).toBe(true);
      unmount();
    }
  });
});
