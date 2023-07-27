import { test, expect } from '@playwright/test';

test('create pipeline from overview page', async ({ page }) => {
  // Create a standard pipeline using the dropdown menu.
  await page.goto('/overview');
  await page.getByRole('button', { name: 'New pipeline' }).click();
  await page.getByRole('menuitem', { name: 'Standard' }).click();

  // Get the name of the new pipeline.
  await page.waitForURL('**/pipelines/**');
  const path = await page.evaluate(() => document.location.pathname);
  const match = /^\/pipelines\/(\w+)\/.*$/.exec(path);
  const pipelineName = match[1];

  // Verify that the new pipeline is listed on the pipelines page.
  await page.getByRole('link', { name: 'Pipelines' }).click();
  expect(page.getByRole('link', { name: pipelineName })).toBeDefined();
});

test('create pipeline from pipelines page', async ({ page }) => {
  // Create a standard pipeline using the dropdown menu.
  await page.goto('/pipelines');
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('menuitem', { name: 'Standard' }).click();

  // Get the name of the new pipeline.
  await page.waitForURL('**/pipelines/**');
  const path = await page.evaluate(() => document.location.pathname);
  const match = /^\/pipelines\/(\w+)\/.*$/.exec(path);
  const pipelineName = match[1];

  // Verify that the new pipeline is listed on the pipelines page.
  await page.getByRole('link', { name: 'Pipelines' }).click();
  expect(page.getByRole('link', { name: pipelineName })).toBeDefined();
});
