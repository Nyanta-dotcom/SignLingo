import { test, expect, type Request } from '@playwright/test';

// P4-07 (AC-PRIV-01): no frame, landmark or progress ever leaves the browser. Every request in a real
// session stays on our own origin and only reads files; nothing is sent anywhere.
test('a camera session only makes same-origin, read-only requests', async ({ page, baseURL }) => {
  const seen: Request[] = [];
  page.on('request', (r) => {
    if (!r.url().startsWith('data:') && !r.url().startsWith('blob:')) seen.push(r);
  });

  await page.addInitScript(() => localStorage.setItem('signlingo:v1:onboarded', 'true'));
  await page.goto('/practice');
  await page.getByRole('button', { name: 'Bật camera' }).click();
  await expect(page.getByText(/AI đang dùng: landmark-mlp-ens5/)).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(4000); // let the engine process frames
  for (const path of ['/lab', '/collect', '/settings', '/profile']) await page.goto(path);

  const origin = new URL(baseURL ?? 'http://localhost:5173').origin;
  expect(seen.length).toBeGreaterThan(5);
  const foreign = seen.filter((r) => new URL(r.url()).origin !== origin).map((r) => r.url());
  expect(foreign, `requests to other origins: ${foreign.join(', ')}`).toEqual([]);
  const writes = seen.filter((r) => r.method() !== 'GET' && r.method() !== 'HEAD' && r.method() !== 'OPTIONS');
  expect(writes.map((r) => `${r.method()} ${r.url()}`)).toEqual([]);
  expect(seen.filter((r) => r.postData()).map((r) => r.url())).toEqual([]);
});

test('the page restricts connections to its own origin (CSP is only applied on Vercel, so check the config)', async () => {
  const { readFileSync } = await import('node:fs');
  const config = JSON.parse(readFileSync(new URL('../../frontend/vercel.json', import.meta.url), 'utf-8'));
  const headers = JSON.stringify(config.headers);
  expect(headers).toMatch(/connect-src 'self'/);
  expect(headers).toMatch(/camera=\(self\)/);
});
