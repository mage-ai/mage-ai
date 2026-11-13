import { readFile } from 'fs/promises';

import { expect, test } from './base';

test('downloads dependency graph as SVG', async ({ page }, testInfo) => {
  await page.goto('/pipelines/example_pipeline/triggers');

  await expect(page.getByText('load_titanic')).toBeVisible();
  await expect(page.getByText('fill_in_missing_values')).toBeVisible();
  await expect(page.getByText('export_titanic_clean')).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ]);

  expect(download.suggestedFilename()).toBe('example_pipeline_dependency_tree.svg');

  const downloadPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(downloadPath);

  const downloadedSvg = await readFile(downloadPath, 'utf8');

  expect(downloadedSvg).toContain('<svg');
  expect(downloadedSvg).toContain('<foreignObject');
  expect(downloadedSvg).toContain('http://www.w3.org/1999/xhtml');
  expect(downloadedSvg).toContain('load_titanic');
  expect(downloadedSvg).toContain('fill_in_missing_values');
  expect(downloadedSvg).toContain('export_titanic_clean');
});
