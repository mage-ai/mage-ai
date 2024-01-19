import { test, expect } from './base';

const visibleTimeout = 10000;

test.beforeEach(async ({ page }, testInfo) => {
  // Set timeout for all tests running this hook to 30 seconds.
  testInfo.setTimeout(30000);
});

test.afterEach(async ({ page }, testInfo) => {
  await page.getByRole('menuitem', { name: 'Standard (batch)' }).click();
  await page.waitForURL('**/pipelines/**');

  const pathStr = await page.evaluate(() => document.location.pathname);
  const path = pathStr.split('/'); // ['','pipelines','<pipeline-id>','edit']
  const pipelineName = path[2];
  expect(path[1]).toBe('pipelines');
  expect(path[3]).toBe('edit');
  await expect(page.locator('[id="__next"]')).toContainText(path[2]);
  await page.getByRole('link', { name: 'Pipelines' }).click();
  await expect(page.getByText('Name', { exact: true })).toBeVisible({ timeout: visibleTimeout });

  page.on('dialog', async dialog => {
    if (dialog.message() === `Are you sure you want to delete pipeline ${pipelineName}?`) {
      await dialog.accept();
    } else {
      throw new Error(`Unexpected dialog: ${dialog.message()}`);
    }
  });

  // Search for pipeline name in case it is on a different page.
  await page.getByRole('textbox').first().fill(pipelineName);

  await expect(page.getByRole('cell', { name: pipelineName })).toBeVisible({ timeout: visibleTimeout });
  await page.getByRole('cell', { name: pipelineName }).click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.getByRole('cell', { name: pipelineName })).toBeHidden();
});

test('create and delete pipeline from Overview page', async ({ page }) => {
  await page.goto('/overview');
  await expect(page.getByText('Pipeline run metrics')).toBeVisible({ timeout: visibleTimeout });
  await page.getByRole('button', { name: 'New pipeline' }).click();
});

test('create and delete pipeline from Pipelines Dashboard', async ({ page }) => {
  await page.goto('/pipelines');
  await expect(page.getByText('Name', { exact: true })).toBeVisible({ timeout: visibleTimeout });
  await page.getByRole('button', { name: 'New' }).click();
});
