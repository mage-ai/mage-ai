import { expect, test } from './base';

test('ensure users can download jpeg image of dependency graph', async ({ page }) => {
  await page.goto('/pipelines/example_pipeline/edit');
  const downloadButton = page.getByRole('button', { name: 'Download' });
  await downloadButton.scrollIntoViewIfNeeded();
  await expect(downloadButton).toBeVisible();
  await downloadButton.click();
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
  const downloadButton = page.getByRole('button', { name: 'Download' });
  await downloadButton.scrollIntoViewIfNeeded();
  await expect(downloadButton).toBeVisible();
  await downloadButton.click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByText('PNG Format').click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^dependency-graph\.png$/);
  const path = await download.path();
  expect(path).not.toBeNull();
});
