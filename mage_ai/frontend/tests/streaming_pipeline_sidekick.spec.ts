import { Page } from '@playwright/test';
import { expect, test } from './base';

// ─── helpers ────────────────────────────────────────────────────────────────

async function createStreamingPipeline(page: Page): Promise<string> {
  await page.goto('/pipelines');
  await expect(page.getByText('Name', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('menuitem', { name: 'Streaming' }).click();
  await page.getByRole('button', { exact: true, name: 'Create' }).click();
  await page.waitForURL('**/pipelines/**');
  const pathStr = await page.evaluate(() => document.location.pathname);
  return pathStr.split('/')[2]; // pipeline uuid
}

async function deleteStreamingPipeline(page: Page, pipelineName: string): Promise<void> {
  await page.goto('/pipelines');
  await expect(page.getByText('Name', { exact: true })).toBeVisible();
  page.on('dialog', async dialog => {
    if (dialog.message().includes(pipelineName)) {
      await dialog.accept();
    }
  });
  await page.getByRole('textbox').first().fill(pipelineName);
  await expect(page.getByText('All pipelines › 1')).toBeVisible();
  await page.getByRole('cell', { name: pipelineName }).click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Delete' })).toBeVisible();
  await page.getByRole('menuitem', { name: 'Delete' }).click();
  await expect(page.getByRole('cell', { name: pipelineName })).toBeHidden();
}

function getDragHandle(page: Page) {
  return page.getByRole('separator', { name: 'Resize output panel' });
}

function getTreeToggle(page: Page) {
  return page.getByTestId('tree-toggle').getByRole('checkbox');
}

function getOutputToggle(page: Page) {
  return page.getByTestId('output-toggle').getByRole('checkbox');
}

async function goToTreeView(page: Page, pipelineName: string): Promise<void> {
  await page.goto(`/pipelines/${pipelineName}/edit?sideview=tree`);
  await expect(getDragHandle(page)).toBeVisible();
}

// ─── tests ──────────────────────────────────────────────────────────────────

test('drag handle is visible in streaming tree view', async ({ page }) => {
  const pipelineName = await createStreamingPipeline(page);
  await goToTreeView(page, pipelineName);

  await expect(getDragHandle(page)).toBeVisible();

  await deleteStreamingPipeline(page, pipelineName);
});

test('header shows Tree and Output toggle labels', async ({ page }) => {
  const pipelineName = await createStreamingPipeline(page);
  await goToTreeView(page, pipelineName);

  // Verify the renamed "Output" label (was previously "Hide") and the "Tree" label
  await expect(page.getByTestId('tree-toggle')).toBeVisible();
  await expect(page.getByTestId('output-toggle')).toBeVisible();
  await expect(page.getByText('Tree').first()).toBeVisible();
  await expect(page.getByText('Output').first()).toBeVisible();

  await deleteStreamingPipeline(page, pipelineName);
});

test('tree toggle hides and shows the drag handle', async ({ page }) => {
  const pipelineName = await createStreamingPipeline(page);
  await goToTreeView(page, pipelineName);

  await getTreeToggle(page).uncheck();
  await expect(getDragHandle(page)).not.toBeVisible();

  await getTreeToggle(page).check();
  await expect(getDragHandle(page)).toBeVisible();

  await deleteStreamingPipeline(page, pipelineName);
});

test('output toggle hides and shows the execution panel output', async ({ page }) => {
  const pipelineName = await createStreamingPipeline(page);
  await goToTreeView(page, pipelineName);

  // Hide output — drag handle remains visible because tree is still shown
  await getOutputToggle(page).uncheck();
  await expect(getDragHandle(page)).toBeVisible();

  // Restore output
  await getOutputToggle(page).check();
  await expect(getDragHandle(page)).toBeVisible();

  await deleteStreamingPipeline(page, pipelineName);
});

test('output toggle is disabled when tree is hidden (mutual exclusion)', async ({ page }) => {
  const pipelineName = await createStreamingPipeline(page);
  await goToTreeView(page, pipelineName);

  // Hide tree — output toggle wrapper gains pointer-events:none
  await getTreeToggle(page).uncheck();
  await expect(page.getByTestId('output-toggle')).toHaveCSS('pointer-events', 'none');

  // Restore tree — output toggle is interactive again
  await getTreeToggle(page).check();
  await expect(page.getByTestId('output-toggle')).not.toHaveCSS('pointer-events', 'none');

  await deleteStreamingPipeline(page, pipelineName);
});

test('tree hidden state persists across page reload', async ({ page }) => {
  const pipelineName = await createStreamingPipeline(page);
  await goToTreeView(page, pipelineName);

  // Hide tree (saved to localStorage)
  await getTreeToggle(page).uncheck();
  await expect(getDragHandle(page)).not.toBeVisible();

  // Reload and re-navigate
  await page.reload();
  await page.waitForURL('**/pipelines/**');
  await expect(getDragHandle(page)).not.toBeVisible();

  // Restore for cleanup
  await getTreeToggle(page).check();

  await deleteStreamingPipeline(page, pipelineName);
});

test('drag handle resizes output panel', async ({ page }) => {
  const pipelineName = await createStreamingPipeline(page);
  await goToTreeView(page, pipelineName);

  const handle = getDragHandle(page);
  const boxBefore = await handle.boundingBox();
  expect(boxBefore).not.toBeNull();

  const midX = boxBefore.x + boxBefore.width / 2;
  const midY = boxBefore.y + boxBefore.height / 2;

  // Drag upward 100px to enlarge output panel; steps ensures RAF-throttled handler fires
  await page.mouse.move(midX, midY);
  await page.mouse.down();
  await page.mouse.move(midX, midY - 100, { steps: 10 });
  await page.mouse.up();

  const boxAfter = await handle.boundingBox();
  expect(boxAfter).not.toBeNull();
  expect(boxAfter.y).toBeLessThan(boxBefore.y - 50);

  await deleteStreamingPipeline(page, pipelineName);
});

test('output height persists across page reload', async ({ page }) => {
  const pipelineName = await createStreamingPipeline(page);
  await goToTreeView(page, pipelineName);

  const handle = getDragHandle(page);
  const boxBefore = await handle.boundingBox();
  expect(boxBefore).not.toBeNull();

  const midX = boxBefore.x + boxBefore.width / 2;
  const midY = boxBefore.y + boxBefore.height / 2;

  // Drag upward 100px (height saved to localStorage on mouseUp)
  await page.mouse.move(midX, midY);
  await page.mouse.down();
  await page.mouse.move(midX, midY - 100, { steps: 10 });
  await page.mouse.up();

  const boxAfterDrag = await handle.boundingBox();
  expect(boxAfterDrag).not.toBeNull();

  // Reload and re-navigate
  await page.reload();
  await page.waitForURL('**/pipelines/**');

  const boxAfterReload = await handle.boundingBox();
  expect(boxAfterReload).not.toBeNull();
  // Handle position should be within 10px of the dragged position
  expect(Math.abs(boxAfterReload.y - boxAfterDrag.y)).toBeLessThan(10);

  await deleteStreamingPipeline(page, pipelineName);
});
