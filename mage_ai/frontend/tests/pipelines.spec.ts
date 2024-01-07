import { test, expect } from './base';

test('create pipeline from overview page', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('/overview');
  await page.getByRole('button', { name: 'New pipeline' }).click();
  await page.getByRole('menuitem', { name: 'Standard (batch)' }).click();
  await page.waitForURL('**/pipelines/**');

  const pathStr = await page.evaluate(() => document.location.pathname);
  const path = pathStr.split('/'); // ['','pipelines','<pipeline-id>','edit']
  expect(path[1]).toBe('pipelines');
  expect(path[3]).toBe('edit');
  await expect(page.locator('[id="__next"]')).toContainText(path[2]);

  await page.getByRole('link', { name: 'Pipelines' }).click();
  await page.goto('/pipelines');
  await page.goto('/pipelines?_limit=30');
  await expect(page.getByRole('link', { name: path[2] })).toBeVisible();
});
