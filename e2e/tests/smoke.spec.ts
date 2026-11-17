import { test, expect } from '@playwright/test';

test('home page renders title', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'SignLingo AI' })).toBeVisible();
});
