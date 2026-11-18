import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/tokens.css'), 'utf8');
const block = (selector: string) => {
  const m = css.match(new RegExp(`${selector.replace(/[[\]]/g, '\\$&')}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`no ${selector} block`);
  return Object.fromEntries([...m[1].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((x) => [x[1], x[2].trim()]));
};
const light = block(':root');
const dark = { ...light, ...block(":root[data-theme='dark']") };

function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('tokens match docs/05 §2', () => {
  it('has the brand palette', () => {
    expect(light).toMatchObject({
      'brand-50': '#eef5ff', 'brand-600': '#1d6fe8', 'brand-700': '#1557c0', 'brand-900': '#0f3570',
      'sky-400': '#38bdf8', 'sky-500': '#0ea5e9',
    });
  });
  it('has light and dark surfaces', () => {
    expect(light).toMatchObject({ bg: '#f5f9ff', surface: '#ffffff', text: '#0f172a', border: '#d6e0ee' });
    expect(dark).toMatchObject({ bg: '#0b1220', surface: '#111a2e', text: '#e6edf8', border: '#263354' });
  });
  it('has semantic colours for both themes', () => {
    expect(light['success-fg']).toBe('#15803d');
    expect(dark['success-fg']).toBe('#4ade80');
    expect(dark['danger-bg']).toBe('#2a1215');
  });
  it('keeps text readable (AA 4.5:1) on the main surfaces in both themes', () => {
    for (const t of [light, dark]) {
      expect(contrast(t.text, t.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t['text-muted'], t.surface)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(light['text-on-brand'], light['brand-600'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark['success-fg'], dark['success-bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dark['danger-on-bg'], dark['danger-bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['danger-fg'], light['surface'])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light['danger-on-bg'], light['danger-bg'])).toBeGreaterThanOrEqual(4.5);
    for (const t of [light, dark]) {
      for (const surface of ['bg', 'surface', 'surface-2']) {
        expect(contrast(t['brand-fg'], t[surface]), `brand-fg on ${surface}`).toBeGreaterThanOrEqual(4.5);
      }
    }
    expect(contrast(light['brand-fg'], '#eef5ff')).toBeGreaterThanOrEqual(4.5);
  });
});
