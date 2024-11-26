import { expect, test } from './base';

test('ensure all main pages load properly', async ({ page }) => {
  async function navigateToAndWaitTilLoaded(name: string) {
    await page.locator('div[class*="indexstyle__VerticalNavigationStyleComponent"] > div').hover();
    await page.getByRole('link', { name })
      .and(page.getByTestId('navigation_link'))
      .click();
    await page.waitForLoadState();

    /*
     * There are multiple elements with the page title text, so we want to
     * get the one in the header's breadcrumbs specifically since that will
     * change when navigating from page to page.
     */
    const headerBreadcrumbTitleNode = page
        .locator('div[class*="indexstyle__HeaderStyle"] > div > div > div > div > p')
        .filter({ hasText: name });
    await expect(headerBreadcrumbTitleNode).toBeVisible();
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
});
