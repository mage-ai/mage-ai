import { Page, expect } from '@playwright/test';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';

import { FeatureUUIDEnum } from '@interfaces/ProjectType';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { ignoreKeys } from '@utils/hash';

export type TSettingFeaturesToDisable = Partial<
  Record<FeatureUUIDEnum, boolean>
>;

function getSettingsToEnable(
  settingFeaturesToDisable: TSettingFeaturesToDisable,
): FeatureUUIDEnum[] {
  const settingsToEnable: FeatureUUIDEnum[] = [];
  const featuresFiltered = ignoreKeys(FeatureUUIDEnum, [
    'CODE_BLOCK_V2',
    'COMMAND_CENTER',
    'COMPUTE_MANAGEMENT',
    'CUSTOM_DESIGN',
    'DBT_V2',
    'GLOBAL_HOOKS',
    'NOTEBOOK_BLOCK_OUTPUT_SPLIT_VIEW',
]);

  for (const feature in featuresFiltered) {
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
  await page.waitForLoadState();
  await expect(page.getByText('Add new block v2')).toBeVisible();

  const helpImproveMageToggle = page.locator('#help_improve_mage_toggle');
  const helpImproveMageToggleInput = page.locator('#help_improve_mage_toggle_input');
  if (await helpImproveMageToggleInput.isChecked()) {
    await helpImproveMageToggle.click();
  }
  await expect(helpImproveMageToggleInput).not.toBeChecked();


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

export async function createStreamingPipeline(page: Page) {
  const pipelineName = `test_pipeline_${Date.now()}`;
  await page.goto('/pipelines');
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('menuitem', { name: 'Streaming' }).click();
  await page.getByRole('button', { exact: true, name: 'Create' }).click();
  await page.waitForURL('**/pipelines/**/edit**', { timeout: 15000 });

  await page.evaluate(() => {
    localStorage.removeItem('pipeline_tree_hidden');
    localStorage.removeItem('pipeline_execution_hidden');
    localStorage.removeItem('pipeline_execution_output_height');
  });
  await page.reload();
  await page.waitForLoadState();
  return pipelineName;
}

export async function createBatchPipeline(page: Page) {
  const pipelineName = `test_pipeline_${Date.now()}`;
  await page.goto('/pipelines');
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('menuitem', { name: 'Standard (batch)' }).click();
  await page.getByRole('button', { exact: true, name: 'Create' }).click();
  await page.waitForURL('**/pipelines/**', { timeout: 15000 });

  await page.evaluate(() => {
    localStorage.removeItem('pipeline_tree_hidden');
    localStorage.removeItem('pipeline_execution_hidden');
    localStorage.removeItem('pipeline_execution_output_height');
  });
  await page.reload();
  await page.waitForLoadState();
  return pipelineName;
}

export async function navigateToTreeView(page: Page) {
  const url = new URL(page.url());
  url.searchParams.set('sideview', 'tree');
  await page.goto(url.toString());

  const container = page.locator('[data-testid="dependency-graph-container"]');
  await expect(async () => {
    const box = await container.boundingBox();
    expect(box?.height).toBeGreaterThan(0);
  }).toPass({ timeout: 10000 });
}

export async function deletePipeline(page: Page, pipelineName: string) {
  if (!pipelineName) return;
  const token = await page.evaluate(
    (clientId) => localStorage.getItem(`token_${clientId}`),
    OAUTH2_APPLICATION_CLIENT_ID
  );
  if (!token) return;
  const parsedToken = JSON.parse(token);

  const response = await page.request.delete(`http://localhost:6789/api/pipelines/${pipelineName}`, {
    headers: {
      Authorization: `Bearer ${parsedToken.token}`,
    },
  });
  expect(response.ok()).toBeTruthy();
}
