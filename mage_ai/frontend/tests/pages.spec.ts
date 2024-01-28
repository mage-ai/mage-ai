import { test, expect } from './base';

test('ensure all pages main pages load', async ({ page }) => {
  async function navigateToAndWaitTilLoaded(name: string) {
    await page.locator('div[class*="indexstyle__VerticalNavigationStyleComponent"] > div').hover();
    await page.getByRole('link', { name: name }).click();
    await page.waitForLoadState('domcontentloaded');
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
