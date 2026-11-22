import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Sign } from '@/content/types';
import { ReferenceHand } from './ReferenceHand';

const withImage = { code: 'LETTER_B', gloss: 'B', kind: 'static', model_task: 'static_letters', model_class_index: 1, media: [{ type: 'image', src: '/media/letters/B.svg', license: 'Public domain', attribution: 'x' }] } as Sign;

describe('ReferenceHand', () => {
  it('shows the picture of the sign with a caption', () => {
    render(<ReferenceHand letter="B" sign={withImage} />);
    expect(screen.getByRole('img', { name: /chữ B/ })).toHaveAttribute('src', '/media/letters/B.svg');
    expect(screen.getByText('Mẫu để đối chiếu')).toBeInTheDocument();
  });

  it('falls back to the drawn hand when the sign has no picture', () => {
    render(<ReferenceHand letter="A" />);
    expect(screen.getByRole('img', { name: /chữ A/ })).toBeInTheDocument();
  });

  it('renders nothing without a letter', () => {
    const { container } = render(<ReferenceHand letter="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
