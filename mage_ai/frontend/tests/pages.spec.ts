import { FeatureUUIDEnum } from '@interfaces/ProjectType';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { test, expect } from './base';

test('ensure all pages main pages load', async ({ page }) => {
  const pageErrors: Error[] = [];

  await page.goto('/settings');

  for (const feature of Object.values(FeatureUUIDEnum)) {
    const f = capitalizeRemoveUnderscoreLower(feature);
    const toggleButton = page.locator('div').filter({ hasText: new RegExp(`^${f}$`) }).nth(2);
    if (!(await toggleButton.locator('input[type="checkbox"]').isChecked())) {
      await toggleButton.locator('label').click();
    }
  }

  expect(pageErrors).toHaveLength(0);
});
