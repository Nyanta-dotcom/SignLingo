import { test, expect } from '@playwright/test';

test('home page renders title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/SignLingo/);
  await expect(page.getByRole('heading', { level: 1, name: /SignLingo/ })).toBeVisible();
});
