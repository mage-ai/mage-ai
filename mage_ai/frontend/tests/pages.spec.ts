import { capitalizeRemoveUnderscoreLower } from '@utils/string';
import { test, expect } from './base';

enum SettingsToEnableEnum {
  ADD_NEW_BLOCK_V2 = 'add_new_block_v2',
  CODE_BLOCK_V2 = 'code_block_v2',
  COMMAND_CENTER = 'command_center',
  COMPUTE_MANAGEMENT = 'compute_management',
  CUSTOM_DESIGN = 'custom_design',
  DATA_INTEGRATION_IN_BATCH_PIPELINE = 'data_integration_in_batch_pipeline',
  DBT_V2 = 'dbt_v2',
  GLOBAL_HOOKS = 'global_hooks',
  INTERACTIONS = 'interactions',
  NOTEBOOK_BLOCK_OUTPUT_SPLIT_VIEW = 'notebook_block_output_split_view',
  // LOCAL_TIMEZONE = 'display_local_timezone',
  OPERATION_HISTORY = 'operation_history',
}

test('ensure all pages main pages load', async ({ page }) => {
  await page.goto('/settings');

  for (const feature of Object.values(SettingsToEnableEnum)) {
    const f = capitalizeRemoveUnderscoreLower(feature);
    const toggleButton = page.locator('div').filter({ hasText: new RegExp(`^${f}$`) }).nth(2);
    if (!(await toggleButton.locator('input[type="checkbox"]').isChecked())) {
      await toggleButton.locator('label').click();
    }
  }

  await page.getByRole('button', { name: 'Save project settings' }).click();

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
