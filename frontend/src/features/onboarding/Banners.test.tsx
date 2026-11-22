import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Banners } from './Banners';

const state = vi.hoisted(() => ({ storageAvailable: true }));
vi.mock('@/storage/useLearner', () => ({ useLearner: (sel: (s: typeof state) => unknown) => sel(state) }));

beforeEach(() => {
  state.storageAvailable = true;
});

describe('Banners', () => {
  it('shows nothing when storage works', () => {
    const { container } = render(<Banners />);
    expect(container).toBeEmptyDOMElement();
  });

  it('warns that progress will not be saved when storage is blocked', () => {
    state.storageAvailable = false;
    render(<Banners />);
    expect(screen.getByRole('alert')).toHaveTextContent('Tiến độ sẽ không được lưu');
  });
});
