import { expect, test } from './base';

async function createStreamingPipeline(page) {
  await page.goto('/pipelines');
  await expect(page.getByText('Name', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New' }).click();
  await page.getByRole('menuitem', { name: 'Streaming' }).click();
  await page.getByRole('button', { exact: true, name: 'Create' }).click();
  await page.waitForURL('**/pipelines/**');
  const pathStr = await page.evaluate(() => document.location.pathname);
  return pathStr.split('/')[2]; // pipeline uuid
}

async function deleteStreamingPipeline(page, pipelineName: string) {
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

test('drag handle is visible in streaming tree view', async ({ page }) => {
  const pipelineName = await createStreamingPipeline(page);
  await page.goto(`/pipelines/${pipelineName}/edit?sideview=tree`);

  await expect(page.getByRole('separator', { name: 'Resize output panel' })).toBeVisible();

  await deleteStreamingPipeline(page, pipelineName);
});

test('tree toggle hides and shows the dependency graph', async ({ page }) => {
  const pipelineName = await createStreamingPipeline(page);
  await page.goto(`/pipelines/${pipelineName}/edit?sideview=tree`);

  // Drag handle visible initially
  await expect(page.getByRole('separator', { name: 'Resize output panel' })).toBeVisible();

  // Toggle tree off
  const treeToggle = page.locator('label').filter({ has: page.locator('input[type="checkbox"]') }).nth(0);
  // Use the Tree toggle label specifically — find ToggleSwitch near "Tree" text
  const treeLabel = page.locator('text=Tree').locator('..').locator('label');
  await treeLabel.click();

  // Drag handle gone, separator no longer in DOM
  await expect(page.getByRole('separator', { name: 'Resize output panel' })).not.toBeVisible();

  // Toggle tree back on
  await treeLabel.click();
  await expect(page.getByRole('separator', { name: 'Resize output panel' })).toBeVisible();

  await deleteStreamingPipeline(page, pipelineName);
});

test('tree hidden state persists across page reload', async ({ page }) => {
  const pipelineName = await createStreamingPipeline(page);
  await page.goto(`/pipelines/${pipelineName}/edit?sideview=tree`);

  // Hide the tree
  const treeLabel = page.locator('text=Tree').locator('..').locator('label');
  await treeLabel.click();
  await expect(page.getByRole('separator', { name: 'Resize output panel' })).not.toBeVisible();

  // Reload and verify state is preserved via localStorage
  await page.reload();
  await page.goto(`/pipelines/${pipelineName}/edit?sideview=tree`);
  await expect(page.getByRole('separator', { name: 'Resize output panel' })).not.toBeVisible();

  // Restore for cleanup
  await treeLabel.click();

  await deleteStreamingPipeline(page, pipelineName);
});

test('drag handle resizes output panel', async ({ page }) => {
  const pipelineName = await createStreamingPipeline(page);
  await page.goto(`/pipelines/${pipelineName}/edit?sideview=tree`);

  const handle = page.getByRole('separator', { name: 'Resize output panel' });
  await expect(handle).toBeVisible();

  const box = await handle.boundingBox();
  expect(box).not.toBeNull();

  // Drag handle upward by 100px to enlarge the output panel
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y - 100);
  await page.mouse.up();

  // After drag the handle should still be visible (panel didn't collapse)
  await expect(handle).toBeVisible();

  await deleteStreamingPipeline(page, pipelineName);
});
