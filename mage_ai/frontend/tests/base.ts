import { FeatureUUIDEnum } from '@interfaces/ProjectType';
import { test as base, expect } from '@playwright/test';
import { TSettingFeaturesToDisable, enableSettings } from './utils';

export const test = base.extend<{
  failOnClientError: boolean;
  settingFeaturesToDisable: TSettingFeaturesToDisable,
}>({
  failOnClientError: true,
  settingFeaturesToDisable: {
    [FeatureUUIDEnum.LOCAL_TIMEZONE]: true,
  },
  // eslint-disable-next-line sort-keys
  page: async ({ page, failOnClientError, settingFeaturesToDisable }, use) => {
    const pageErrors: Error[] = [];
    page.addListener('pageerror', (error) => {
      pageErrors.push(error);
    });

    await page.goto('/sign-in');
    await page.getByPlaceholder('Email').click();
    await page.getByRole('textbox').first().fill('admin@admin.com');
    await page.getByRole('textbox').first().press('Tab');
    await page.locator('input[type="password"]').fill('admin');
    await page.locator('input[type="password"]').press('Enter');

    /*
     * Wait for redirected page, which can be /overview (if at least 1 pipeline run exists)
     * or /pipelines (if no pipeline runs exist), to load after signing in.
     */
    await expect(page.getByRole('button', { name: 'New' })).toBeVisible();

    await enableSettings(page, settingFeaturesToDisable);

    // Use subsequent tests.
    await use(page);

    if (failOnClientError) {
      expect(pageErrors).toHaveLength(0);
    }
  },
});

export { expect };
