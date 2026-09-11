import { expect, test } from '../base';

const PIPELINE_URL = '/pipelines/example_pipeline/edit';

test('filters data table rows by column value', async ({ page }) => {
  await page.goto(PIPELINE_URL);

  // Run the first block to generate the data table output.
  await page.getByLabel('Run block').first().click();

  // 1. Filter inputs are visible below column headers (waits for block to finish).
  const nameFilter = page.getByLabel('Filter Name column').first();
  await expect(nameFilter).toBeVisible({ timeout: 30_000 });

  // 2. User types a value — matching rows shown, non-matching hidden.
  await nameFilter.fill('Braund, Mr. Owen Harris');

  // 3. Row count updates — Playwright retries until debounce fires and UI settles.
  await expect(page.getByText('1 of 891 rows × 12 columns').first()).toBeVisible({ timeout: 5_000 });

  // 4. User clears filters — full dataset restored.
  await page.getByText('✕ Clear filters').first().click();
  await expect(page.getByText('891 rows x 12 columns').first()).toBeVisible();
});
