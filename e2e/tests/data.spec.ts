import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// P4-09: the learner's data survives reloads, can be exported, wiped and restored, and a blocked
// storage never breaks the app (AC-GAM-01, AC-ACC-01, AC-ACC-02).

test('first visit shows the welcome page once, then goes straight to the learning path', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Bắt đầu' })).toBeVisible();
  await page.getByRole('button', { name: 'Bắt đầu' }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto('/');
  await expect(page).toHaveURL(/\/learn$/);
});

test('settings survive a reload', async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('signlingo:v1:onboarded') ?? localStorage.setItem('signlingo:v1:onboarded', 'true'));
  await page.goto('/settings');
  await page.getByRole('radio', { name: '50 XP' }).check({ force: true });
  await page.getByLabel(/Tên hiển thị/).fill('Lan');
  await page.getByLabel(/Tên hiển thị/).blur();
  await page.reload();
  await expect(page.getByRole('radio', { name: '50 XP' })).toBeChecked();
  await expect(page.getByLabel(/Tên hiển thị/)).toHaveValue('Lan');
});

test('export, wipe and import bring the same data back', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.getItem('signlingo:v1:onboarded') ?? localStorage.setItem('signlingo:v1:onboarded', 'true'));
  await page.goto('/settings');
  await page.getByRole('radio', { name: '30 XP' }).check({ force: true });
  await page.getByLabel(/Tên hiển thị/).fill('Minh');
  await page.getByLabel(/Tên hiển thị/).blur();

  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Xuất tiến độ' }).click()]);
  expect(download.suggestedFilename()).toMatch(/^signlingo_backup_\d{4}-\d{2}-\d{2}\.json$/);
  const file = info.outputPath('backup.json');
  await download.saveAs(file);
  const backup = JSON.parse(readFileSync(file, 'utf-8'));
  expect(backup.data.settings.daily_xp_goal).toBe(30);

  await page.getByRole('button', { name: 'Xóa toàn bộ dữ liệu' }).click();
  await page.getByRole('button', { name: 'Xóa vĩnh viễn' }).click();
  await expect(page.getByRole('status')).toHaveText('Đã xóa toàn bộ dữ liệu.');
  await page.reload();
  await page.goto('/settings');
  await expect(page.getByRole('radio', { name: '20 XP' })).toBeChecked();

  await page.getByLabel('Nhập tiến độ').setInputFiles(file);
  await page.getByRole('button', { name: 'Ghi đè và nhập' }).click();
  await expect(page.getByRole('status')).toHaveText('Đã nhập tiến độ.');
  await page.reload();
  await expect(page.getByRole('radio', { name: '30 XP' })).toBeChecked();
  await expect(page.getByLabel(/Tên hiển thị/)).toHaveValue('Minh');
});

test('a corrupt backup is rejected and nothing changes', async ({ page }, info) => {
  await page.addInitScript(() => localStorage.getItem('signlingo:v1:onboarded') ?? localStorage.setItem('signlingo:v1:onboarded', 'true'));
  await page.goto('/settings');
  await page.getByRole('radio', { name: '10 XP' }).check({ force: true });
  const { writeFileSync } = await import('node:fs');
  const bad = info.outputPath('bad.json');
  writeFileSync(bad, JSON.stringify({ schema_version: 1 }));
  await page.getByLabel('Nhập tiến độ').setInputFiles(bad);
  await page.getByRole('button', { name: 'Ghi đè và nhập' }).click();
  await expect(page.getByRole('status')).toContainText('File không hợp lệ');
  await page.reload();
  await expect(page.getByRole('radio', { name: '10 XP' })).toBeChecked();
});

test('blocked storage shows a warning and the app keeps working', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/settings');
  await expect(page.getByRole('alert').first()).toContainText('Tiến độ sẽ không được lưu');
  await page.getByRole('radio', { name: '30 XP' }).check({ force: true });
  await expect(page.getByRole('radio', { name: '30 XP' })).toBeChecked();
  expect(errors).toEqual([]);
});

test('finishing a lesson saves XP and opens the next one, and it all survives a reload (AC-GAM-01)', async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('signlingo:v1:onboarded') ?? localStorage.setItem('signlingo:v1:onboarded', 'true'));
  await page.goto('/learn');
  await page.getByRole('button', { name: /^Bài 1: A B C D: sẵn sàng$/ }).click();
  await page.getByRole('link', { name: 'Bắt đầu' }).click();
  await expect(page).toHaveURL(/\/lesson\/U1L1$/);

  // Each letter is a card followed by a sign to perform; skipping the signs is enough to walk the whole lesson.
  for (let i = 0; i < 4; i += 1) {
    await page.getByRole('button', { name: 'Tiếp tục' }).click();
    await page.getByRole('button', { name: 'Bỏ qua' }).click();
    await page.getByRole('button', { name: 'Tiếp tục' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Hoàn thành bài học!' })).toBeVisible();
  await page.getByRole('button', { name: 'Tiếp tục' }).last().click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole('button', { name: /^Bài 1: A B C D: đã hoàn thành$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Bài 2: E F G H: sẵn sàng$/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: /^Bài 1: A B C D: đã hoàn thành$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Bài 2: E F G H: sẵn sàng$/ })).toBeVisible();
  const stats = JSON.parse(await page.evaluate(() => localStorage.getItem('signlingo:v1:stats') ?? '{}'));
  expect(stats.total_xp).toBeGreaterThan(0);
});
