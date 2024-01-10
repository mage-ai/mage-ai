import { test, expect } from './base';

test('create_and_delete pipeline from "/overview"', async ({ page }) => {
  test.setTimeout(60000);

  await page.goto('/overview');
  await page.getByRole('button', { name: 'New pipeline' }).click();
  await page.getByRole('menuitem', { name: 'Standard (batch)' }).click();
  await page.waitForURL('**/pipelines/**');

  const pathStr = await page.evaluate(() => document.location.pathname);
  const path = pathStr.split('/'); // ['','pipelines','<pipeline-id>','edit']
  const pipelineName = path[2];
  expect(path[1]).toBe('pipelines');
  expect(path[3]).toBe('edit');
  await expect(page.locator('[id="__next"]')).toContainText(path[2]);
  await page.getByRole('link', { name: 'Pipelines' }).click();

  page.on('dialog', async dialog => {
    if (dialog.message() === `Are you sure you want to delete pipeline ${pipelineName}?`) {
      await dialog.accept();
    } else {
      throw new Error(`Unexpected dialog: ${dialog.message()}`);
    }
  });
  await expect(page.getByRole('cell', { name: pipelineName })).toBeVisible({ timeout: 10000 });
  await page.getByRole('cell', { name: pipelineName }).click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.getByRole('cell', { name: pipelineName })).toBeHidden();
});
