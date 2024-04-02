import { expect, test } from './base';

test('ensure pipeline "example_pipeline" runs successfully', async ({ page }) => {
  // This test assumes the "example_pipeline" pipeline exists in a new project.
  await page.goto('/pipelines');

  // Go to pipeline's trigger page.
  await page.getByRole('link', { name: 'example_pipeline' }).click();
  await page.getByRole('button', { name: 'Run@once' }).click();
  await page.getByRole('button', { name: 'Run now' }).click();

  // Expect trigger's status change from `N/A` to 'running'.
  await expect(page.locator('#pipeline-triggers-row-0')).toContainText('running');

  // Go to trigger's detail page.
  await page.locator('#pipeline-triggers-row-0').getByRole('link').click();
  await expect(page.getByRole('button', { name: 'Running' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Done' })).toBeVisible();

  // Go back to pipeline's trigger page.
  await page.getByRole('link', { name: 'example_pipeline' }).click();
  await expect(page.locator('#pipeline-triggers-row-0')).toContainText('completed');
});
