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

/**
 * Creates a fresh Streaming pipeline via the Pipelines dashboard and returns
 * its URL slug (name).
 *
 * @remarks
 * After the pipeline is created, the following sidekick-related `localStorage`
 * keys are cleared and the page is reloaded so the Sidekick component mounts
 * with a clean default state, unaffected by any previous test run:
 * - `pipeline_tree_hidden`
 * - `pipeline_execution_hidden`
 * - `pipeline_execution_output_height`
 *
 * Intended for use inside `test.beforeEach` in streaming pipeline test suites.
 *
 * @param page - The Playwright {@link Page} for the current test.
 * @returns The pipeline name / URL slug extracted from the redirect URL
 *   (e.g. `"vibrant-firefly-4"`). Pass this value to {@link deletePipeline}
 *   inside `test.afterEach` to clean up after the test.
 */
export async function createStreamingPipeline(page: Page): Promise<string> {
  await page.goto('/pipelines');
  await page.getByRole('button', { name: 'New' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('menuitem', { name: 'Streaming' }).click();
  await page.getByRole('button', { exact: true, name: 'Create' }).click();
  await page.waitForURL('**/pipelines/**');

  // Clear any persisted sidekick state from a previous test run before the
  // component mounts and reads localStorage on the next page load.
  await page.evaluate(() => {
    localStorage.removeItem('pipeline_tree_hidden');
    localStorage.removeItem('pipeline_execution_hidden');
    localStorage.removeItem('pipeline_execution_output_height');
  });
  await page.reload();
  await page.waitForLoadState();

  const pathStr = await page.evaluate(() => document.location.pathname);
  const path = pathStr.split('/'); // ['', 'pipelines', '<pipeline-name>', 'edit']
  return path[2];
}

/**
 * Creates a fresh Standard (batch) pipeline via the Pipelines dashboard and
 * returns its URL slug (name).
 *
 * @remarks
 * Unlike {@link createStreamingPipeline}, this helper intentionally does **not**
 * clear `pipeline_tree_hidden` from localStorage. This is required by T18, which
 * must keep the key set (as a streaming pipeline would have left it) to reproduce
 * the cross-pipeline-type contamination scenario.
 *
 * @param page - The Playwright {@link Page} for the current test.
 * @returns The pipeline name / URL slug extracted from the redirect URL.
 *   Pass this to {@link deletePipeline} to clean up after the test.
 */
export async function createBatchPipeline(page: Page): Promise<string> {
  await page.goto('/pipelines');
  await page.getByRole('button', { name: 'New' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('menuitem', { name: 'Standard (batch)' }).click();
  await page.getByRole('button', { exact: true, name: 'Create' }).click();
  await page.waitForURL('**/pipelines/**');

  const pathStr = await page.evaluate(() => document.location.pathname);
  const path = pathStr.split('/'); // ['', 'pipelines', '<pipeline-name>', 'edit']
  return path[2];
}

/**
 * Navigates to the Tree view in the pipeline editor sidekick.
 *
 * @remarks
 * Must be called while the browser is already on a pipeline edit page
 * (`/pipelines/<name>/edit`). Rather than interacting with the hover-to-expand
 * sidekick navigation UI, this helper sets the `sideview=tree` query param
 * directly (matching the `VIEW_QUERY_PARAM` key in `Sidekick/constants.ts`
 * and the `setActiveSidekickView` URL update in `edit.tsx:619`). This is
 * the same URL transition the nav click produces, making it reliable without
 * any hover timing.
 *
 * @param page - The Playwright {@link Page} for the current test.
 */
export async function navigateToTreeView(page: Page): Promise<void> {
  const url = new URL(page.url());
  url.searchParams.set('sideview', 'tree');
  await page.goto(url.toString());

  // The container renders immediately but starts with height:0 because
  // useWindowSize() initialises as undefined (SSR) and only resolves after
  // the first useEffect tick. Poll until the bounding box has positive height.
  const container = page.locator('[data-testid="dependency-graph-container"]');
  await container.waitFor({ state: 'attached' });
  await expect(container).toBeAttached();
  await expect(async () => {
    const box = await container.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThan(0);
  }).toPass({ timeout: 15000 });
}

/**
 * Permanently deletes a pipeline via the Mage REST API.  
 * Intended for use inside `test.afterEach` to clean up pipelines created by
 * {@link createStreamingPipeline}.
 * 
 * @remarks
 * Bypass the pipelines-list UI entirely. The right-click context menu has a
 * stale-closure bug. `renderRightClickMenuItems` captures `pipelinesInner` from a
 * memoised `renderTable` callback whose deps don't include `pipelines`, so
 * `selectedPipeline?.uuid` can be `undefined` when a background API poll fires
 * between the cell-visibility check and the actual click. A direct `DELETE`
 * avoids all of that *flakiness*.
 *
 * @param page - The Playwright {@link Page} for the current test.
 * @param pipelineName - The pipeline URL slug as returned by
 *   {@link createStreamingPipeline}.
 * @throws {Error} If the DELETE API request returns a non-OK status.
 */
export async function deletePipeline(page: Page, pipelineName: string): Promise<void> {
  if (!pipelineName) return;
  const response = await page.request.delete(
    `http://localhost:6789/api/pipelines/${pipelineName}?api_key=${OAUTH2_APPLICATION_CLIENT_ID}`,
  );
  expect(response.ok()).toBeTruthy();
}
