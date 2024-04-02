import { Page, expect } from '@playwright/test';

import { FeatureUUIDEnum } from '@interfaces/ProjectType';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';

export type TSettingFeaturesToDisable = Partial<
  Record<FeatureUUIDEnum, boolean>
>;

function getSettingsToEnable(
  settingFeaturesToDisable: TSettingFeaturesToDisable,
): FeatureUUIDEnum[] {
  const settingsToEnable: FeatureUUIDEnum[] = [];

  for (const feature in FeatureUUIDEnum) {
    if (!settingFeaturesToDisable[
      FeatureUUIDEnum[feature as keyof typeof FeatureUUIDEnum]
    ]) {
      console.log(`ENABLE: ${feature}`);
      settingsToEnable.push(
        FeatureUUIDEnum[feature as keyof typeof FeatureUUIDEnum],
      );
    } else {
      console.log(`DISABLE: ${feature}`);
    }
  }

  return settingsToEnable;
}

export async function enableSettings(
  page: Page,
  settingFeaturesToDisable: TSettingFeaturesToDisable,
) {
  await page.goto('/settings');

  const helpImproveMageToggle = page.getByTestId('help_improve_mage_toggle');
  if (await helpImproveMageToggle.isChecked()) {
    await helpImproveMageToggle.click();
  }
  await expect(helpImproveMageToggle).not.toBeChecked();


  const features = getSettingsToEnable(settingFeaturesToDisable);

  for (const feature of features) {
    const f = capitalizeRemoveUnderscoreLower(feature);
    const toggleButton = page
      .locator('div')
      .filter({ hasText: new RegExp(`^${f}$`) })
      .nth(2);
    if (!(await toggleButton.locator('input[type="checkbox"]').isChecked())) {
      await toggleButton.locator('label').click();
    }
  }

  await page.getByRole('button', { name: 'Save project settings' }).click();
}
