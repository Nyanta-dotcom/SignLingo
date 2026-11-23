import { test, expect } from '@playwright/test';

// P4-09: the learner's data survives reloads, can be exported, wiped and restored, and a blocked
// storage never breaks the app (AC-GAM-01, AC-ACC-01, AC-ACC-02).

test('first visit offers "Bắt đầu", which opens the learning path; a returning learner sees "Tiếp tục học"', async ({ page }) => {
  await page.goto('/');
  const start = page.getByRole('button', { name: 'Bắt đầu', exact: true }).first();
  await expect(start).toBeVisible();
  await start.click();
  await expect(page).toHaveURL(/\/learn$/);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Tiếp tục học' }).first()).toBeVisible();
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

test('there is no export button, and wiping the data resets the settings', async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('signlingo:v1:onboarded') ?? localStorage.setItem('signlingo:v1:onboarded', 'true'));
  await page.goto('/settings');
  await expect(page.getByRole('button', { name: 'Xuất tiến độ' })).toHaveCount(0);
  await page.getByRole('radio', { name: '30 XP' }).check({ force: true });
  await page.getByLabel(/Tên hiển thị/).fill('Minh');
  await page.getByLabel(/Tên hiển thị/).blur();

  await page.getByRole('button', { name: 'Xóa toàn bộ dữ liệu' }).click();
  await page.getByRole('button', { name: 'Xóa vĩnh viễn' }).click();
  await expect(page.getByRole('status')).toHaveText('Đã xóa toàn bộ dữ liệu.');
  await page.reload();
  await page.goto('/settings');
  await expect(page.getByRole('radio', { name: '20 XP' })).toBeChecked();
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

test('a lesson that is skipped through does not count: no XP, and the next lesson stays locked', async ({ page }) => {
  await page.addInitScript(() => localStorage.getItem('signlingo:v1:onboarded') ?? localStorage.setItem('signlingo:v1:onboarded', 'true'));
  await page.goto('/learn');
  await page.getByRole('button', { name: /^Bài 1: A B C D: sẵn sàng$/ }).click();
  await page.getByRole('link', { name: 'Bắt đầu' }).click();
  await expect(page).toHaveURL(/\/lesson\/U1L1$/);

  // Each letter is a card followed by a sign to perform; skipping every sign walks the lesson with 0% correct.
  for (let i = 0; i < 4; i += 1) {
    await page.getByRole('button', { name: 'Tiếp tục' }).click();
    await page.getByRole('button', { name: 'Bỏ qua' }).click();
    await page.getByRole('button', { name: 'Tiếp tục' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Chưa đạt' })).toBeVisible();
  await page.getByRole('button', { name: 'Về lộ trình' }).click();
  await expect(page).toHaveURL(/\/learn$/);
  await expect(page.getByRole('button', { name: /^Bài 1: A B C D: sẵn sàng$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Bài 2: E F G H: chưa mở$/ })).toBeVisible();
  const stats = JSON.parse(await page.evaluate(() => localStorage.getItem('signlingo:v1:stats') ?? '{}'));
  expect(stats.total_xp ?? 0).toBe(0);
});

// A real sign cannot be made in front of Chrome's fake camera, so the finished lesson is stored the way the app
// stores it (docs/03 §3.2). The full play-through, including a verified sign, is covered by the component tests.
test('a completed lesson and the XP stay after a reload and open the next lesson (AC-GAM-01)', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('signlingo:v1:seeded')) return;
    localStorage.setItem('signlingo:v1:seeded', 'true');
    localStorage.setItem('signlingo:v1:onboarded', 'true');
    localStorage.setItem('signlingo:v1:progress', JSON.stringify({ U1L1: { status: 'completed', best_accuracy_pct: 100, times_completed: 1, last_completed_at: new Date().toISOString() } }));
    localStorage.setItem('signlingo:v1:stats', JSON.stringify({ total_xp: 20, current_streak: 1, longest_streak: 1, last_goal_date: null, hearts: 5, hearts_updated_at: new Date().toISOString() }));
  });
  await page.goto('/learn');
  await expect(page.getByRole('button', { name: /^Bài 1: A B C D: đã hoàn thành$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Bài 2: E F G H: sẵn sàng$/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /^Bài 2: E F G H: sẵn sàng$/ })).toBeVisible();
  await page.goto('/profile');
  await expect(page.getByText('Tổng XP').locator('xpath=following-sibling::dd')).toHaveText('20');
});
