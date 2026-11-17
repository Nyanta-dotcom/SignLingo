import { test, expect } from '@playwright/test';

// P0-11: WASM threads need cross-origin isolation (COOP/COEP headers).
test('page is cross-origin isolated', async ({ page }) => {
  await page.goto('/');
  expect(await page.evaluate(() => window.crossOriginIsolated)).toBe(true);
});
