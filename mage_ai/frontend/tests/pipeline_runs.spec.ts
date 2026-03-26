import { expect, test } from './base';
import { selectDateTime } from './utils';

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

const dateTimeRangeCases = [
  { url: '/pipeline-runs' },
  { url: '/pipeline-runs?page=7&offset=300' }
];

for (const { url } of dateTimeRangeCases) {
  test(`updates URL ${url} when filtering pipeline runs by a custom date range`, async ({ page }) => {
    await page.goto(url);

    await page
      .locator('select[placeholder="Select time range"]')
      .selectOption({ label: 'Custom range' });

    await selectDateTime(page, 'Start', '.react-calendar__tile--now', '10', '05');
    await selectDateTime(page, 'End', '.react-calendar__tile--now', '17', '30');

    await page.getByRole('button', { name: /^Filter$/i }).last().click();

    await expect(page).toHaveURL(/start_timestamp=.*end_timestamp=.*/);
    await expect(page).not.toHaveURL(/[?&]page=/);
    await expect(page).not.toHaveURL(/[?&]offset=/);
  });

  const fixedRangeCases = [
    { label: 'Last hour' },
    { label: 'Last day' },
    { label: 'Last week' },
    { label: 'Last 30 days' },
  ];

  for (const { label } of fixedRangeCases) {
    test(`updates URL ${url} for ${label} filter`, async ({ page }) => {
      await page.goto(url);

      await page
        .locator('select[placeholder="Select time range"]')
        .selectOption({ label });

      await expect(page).toHaveURL(/start_timestamp=.*/);
      await expect(page).not.toHaveURL(/[?&]page=/);
      await expect(page).not.toHaveURL(/[?&]offset=/);
    });
  }
}