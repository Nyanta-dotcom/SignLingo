import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyTheme, resolveTheme } from './theme';

const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
const block = (selector: string) => {
  const m = css.match(new RegExp(`${selector.replace(/[[\]]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`no ${selector} block`);
  return Object.fromEntries([...m[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]));
};
const light = block(':root');

function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('white & rose-pink light-only design tokens', () => {
  it('defines the rose-pink brand palette and light surfaces', () => {
    expect(light).toMatchObject({
      'brand-50': '#fff4f8',
      'brand-300': '#ff97b5',
      'brand-400': '#ff80a7',
      'brand-500': '#f96d9a',
      'brand-600': '#d42d6c',
      'brand-700': '#b01c54',
      bg: '#fffbfd',
      surface: '#ffffff',
      text: '#1e141d',
    });
  });

  it('does not include dark-mode overrides', () => {
    expect(css).not.toContain("data-theme='dark'");
    expect(resolveTheme('dark', true)).toBe('light');
    expect(applyTheme('dark')).toBe('light');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('keeps text readable (AA 4.5:1) on all main surfaces and pink controls', () => {
    expect(contrast(light.text, light.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light.text, light.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['text-muted'], light.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['text-muted'], light['surface-2'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['ink-on-pink'], light['brand-300'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['ink-on-pink'], light['brand-400'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['ink-on-pink'], light['brand-500'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['text-on-brand'], light['brand-600'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['success-fg'], light['success-bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['danger-fg'], light.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['danger-on-bg'], light['danger-bg'])).toBeGreaterThanOrEqual(4.5);
    for (const surface of ['bg', 'surface', 'surface-2', 'brand-50', 'brand-100']) {
      expect(contrast(light['brand-fg'], light[surface]), `brand-fg on ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(light['focus-ring'], light.surface)).toBeGreaterThanOrEqual(3);
  });
});
