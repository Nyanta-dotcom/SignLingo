import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyTheme, resolveTheme } from '@/styles/theme';
import { ThemeToggle } from './ThemeToggle';

const mockMedia = (dark: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: dark && q.includes('dark'), media: q, addEventListener() {}, removeEventListener() {} }));

afterEach(() => {
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute('data-theme');
});

describe('theme helpers', () => {
  it('system follows the OS, explicit choices win', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
  });
  it('applyTheme sets data-theme on <html>', () => {
    mockMedia(true);
    expect(applyTheme('system')).toBe('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    applyTheme('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });
});

describe('ThemeToggle', () => {
  it('shows three choices with the current one checked', () => {
    render(<ThemeToggle value="dark" onChange={() => {}} />);
    expect(screen.getByRole('radiogroup', { name: /giao diện/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Tối' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Sáng' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Hệ thống' })).not.toBeChecked();
  });
  it('reports the chosen theme and applies it', () => {
    mockMedia(false);
    const onChange = vi.fn();
    render(<ThemeToggle value="system" onChange={onChange} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Tối' }));
    expect(onChange).toHaveBeenCalledWith('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});
