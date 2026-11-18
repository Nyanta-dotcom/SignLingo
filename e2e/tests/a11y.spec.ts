import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

// P4-08 (AC-UI-02): no WCAG 2 A/AA violations on the main screens, in both themes.
const SCREENS = ['/learn', '/practice', '/lab', '/profile', '/settings', '/collect'];

for (const theme of ['light', 'dark'] as const) {
  for (const path of ['/', ...SCREENS]) {
    test(`${path} has no accessibility violations (${theme})`, async ({ page }) => {
      await page.addInitScript(
        ([t, landing]) => {
          localStorage.setItem('signlingo:v1:settings', JSON.stringify({ theme: t }));
          if (!landing) localStorage.setItem('signlingo:v1:onboarded', 'true');
        },
        [theme, path === '/'] as const,
      );
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      const summary = results.violations.map(
        (v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} [${n.any[0]?.message ?? ''}]`).join(' | ')}`,
      );
      expect(summary).toEqual([]);
    });
  }
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
