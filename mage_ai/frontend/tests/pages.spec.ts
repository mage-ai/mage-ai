import { test, expect, VISIBLE_TIMEOUT } from './base';

test('ensure all main pages load properly', async ({ page }) => {
  async function navigateToAndWaitTilLoaded(name: string) {
    await page.locator('div[class*="indexstyle__VerticalNavigationStyleComponent"] > div').hover();
    await page.getByRole('link', { name: name }).first().click();
    await page.waitForLoadState();
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: VISIBLE_TIMEOUT });
  }

  await navigateToAndWaitTilLoaded('Overview');
  await navigateToAndWaitTilLoaded('Pipelines');
  await navigateToAndWaitTilLoaded('Triggers');
  await navigateToAndWaitTilLoaded('Pipeline runs');
  await navigateToAndWaitTilLoaded('Global data products');
  await navigateToAndWaitTilLoaded('Files');
  await navigateToAndWaitTilLoaded('Templates');
  await navigateToAndWaitTilLoaded('Version control');
  await navigateToAndWaitTilLoaded('Terminal');
  await navigateToAndWaitTilLoaded('Global hooks (beta)');
  await navigateToAndWaitTilLoaded('Compute management (beta)');
});
