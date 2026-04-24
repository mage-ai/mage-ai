import { expect, test } from './base';

test('ensure users can download jpeg image of dependency graph', async ({ page }) => {
  await page.goto('/pipelines/example_pipeline/edit');
  await expect(page.locator('svg').first()).toBeVisible({ timeout: 30000 });

  const downloadButton = page.getByRole('button', { name: 'Download image' });
  await downloadButton.scrollIntoViewIfNeeded();
  await expect(downloadButton).toBeVisible();
  await downloadButton.click();

  await expect(page.getByText('JPEG Format')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('JPEG Format').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^dependency-graph\.jpe?g$/);
  const path = await download.path();
  expect(path).not.toBeNull();
});

test('ensure users can download png image of dependency graph', async ({ page }) => {
  await page.goto('/pipelines/example_pipeline/edit');
  await expect(page.locator('svg').first()).toBeVisible({ timeout: 30000 });

  const downloadButton = page.getByRole('button', { name: 'Download image' });
  await downloadButton.scrollIntoViewIfNeeded();
  await expect(downloadButton).toBeVisible();
  await downloadButton.click();

  await expect(page.getByText('PNG Format')).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('PNG Format').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^dependency-graph\.png$/);
  const path = await download.path();
  expect(path).not.toBeNull();
});

