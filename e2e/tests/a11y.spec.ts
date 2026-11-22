import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

// P4-08 (AC-UI-02): no WCAG 2 A/AA violations on the main screens (light-only mode).
const SCREENS = ['/learn', '/practice', '/lab', '/profile', '/settings', '/collect', '/lesson/U1L1'];

for (const path of ['/', ...SCREENS]) {
  test(`${path} has no accessibility violations (light)`, async ({ page }) => {
    await page.addInitScript((landing) => {
      if (!landing) localStorage.setItem('signlingo:v1:onboarded', 'true');
    }, path === '/');
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const summary = results.violations.map(
      (v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} [${n.any[0]?.message ?? ''}]`).join(' | ')}`,
    );
    expect(summary).toEqual([]);
  });
}

test('the learning path can be reached and used with the keyboard only', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('signlingo:v1:onboarded', 'true'));
  await page.goto('/learn');
  await expect(page.getByRole('heading', { level: 1, name: 'Học' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Bỏ qua điều hướng' })).toBeFocused();
  await page.keyboard.press('Enter');
  for (let i = 0; i < 12; i += 1) await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).not.toBe('BODY');
});
