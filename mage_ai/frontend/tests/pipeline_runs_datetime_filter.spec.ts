import { expect, test } from './base';

test('date range button is visible on pipeline runs page', async ({ page }) => {
  await page.goto('/pipeline-runs');

  await page.waitForLoadState('networkidle');

  await expect(page.getByRole('button', { name: /date range/i })).toBeVisible();
});

test('clicking date range button opens the date picker', async ({ page }) => {
  await page.goto('/pipeline-runs');
  await page.getByRole('button', { name: /date range/i }).click();
  await expect(page.getByText('Start')).toBeVisible();
  await expect(page.getByText('End')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Clear' })).toBeVisible();
});

test('applying date range updates the URL with start and end timestamps', async ({ page }) => {
  await page.goto('/pipeline-runs');
  await page.getByRole('button', { name: /date range/i }).click();
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page).toHaveURL(/start_timestamp=\d+/);
  await expect(page).toHaveURL(/end_timestamp=\d+/);
});

test('active date range filter shows a badge on the date range button', async ({ page }) => {
  await page.goto('/pipeline-runs');
  await page.getByRole('button', { name: /date range/i }).click();
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page.getByRole('button', { name: /date range/i }).locator('..').getByText('1')).toBeVisible();
});

test('clearing the date range filter removes timestamps from the URL', async ({ page }) => {
  await page.goto('/pipeline-runs');

  await page.getByRole('button', { name: /date range/i }).click();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/start_timestamp=\d+/);

  await page.getByRole('button', { name: /date range/i }).click();
  await page.getByRole('button', { name: 'Clear' }).click();

  await expect(page).not.toHaveURL(/start_timestamp=/);
  await expect(page).not.toHaveURL(/end_timestamp=/);
});

test('loading pipeline runs page with timestamp params shows active filter badge', async ({ page }) => {
  const start = 1700000000;
  const end = 1700086400;
  await page.goto(`/pipeline-runs?start_timestamp=${start}&end_timestamp=${end}`);

  await expect(page.getByRole('button', { name: /date range/i }).locator('..').getByText('1')).toBeVisible();
});

test('closing date range picker without applying does not change the URL', async ({ page }) => {
  await page.goto('/pipeline-runs');
  const initialUrl = page.url();

  await page.getByRole('button', { name: /date range/i }).click();
  await expect(page.getByRole('button', { name: 'Apply' })).toBeVisible();

  await page.keyboard.press('Escape');

  expect(page.url()).toBe(initialUrl);
});

test('applying date range preserves existing status filter in URL', async ({ page }) => {
  await page.goto('/pipeline-runs?status[]=completed');

  await page.getByRole('button', { name: /date range/i }).click();
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page).toHaveURL(/start_timestamp=\d+/);
  await expect(page).toHaveURL(/status\[\]=completed/);
});

test('applying status filter preserves existing date range in URL', async ({ page }) => {
  const start = 1700000000;
  const end = 1700086400;
  await page.goto(`/pipeline-runs?start_timestamp=${start}&end_timestamp=${end}`);

  await page.getByRole('button', { name: /filter/i }).click();
  await page.getByRole('button', { name: 'Apply' }).click();

  await expect(page).toHaveURL(new RegExp(`start_timestamp=${start}`));
  await expect(page).toHaveURL(new RegExp(`end_timestamp=${end}`));
});

test('date range filter persists across page navigation', async ({ page }) => {
  await page.goto('/pipeline-runs');

  await page.getByRole('button', { name: /date range/i }).click();
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page).toHaveURL(/start_timestamp=\d+/);

  const urlWithFilter = page.url();

  const nextButton = page.getByRole('button', { name: /next/i });
  if (await nextButton.isVisible()) {
    await nextButton.click();
    await expect(page).toHaveURL(/start_timestamp=\d+/);
  } else {
    expect(page.url()).toContain('start_timestamp');
  }
});
