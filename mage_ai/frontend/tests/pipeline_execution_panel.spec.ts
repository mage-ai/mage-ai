import { expect, test } from './base';
import {
  createStreamingPipeline,
  deletePipeline,
  navigateToTreeView,
} from './utils';
import {
  COLLAPSED_PANEL_HEIGHT,
} from '@components/PipelineDetail/PipelineExecution/constants';
import { ALL_HEADERS_HEIGHT } from '@components/TripleLayout/index.style';

test.describe('Pipeline Execution Panel resizing and collapsing', () => {
  let pipelineName: string;

  test.beforeEach(async ({ page }) => {
    pipelineName = await createStreamingPipeline(page);
    await navigateToTreeView(page);
  });

  test.afterEach(async ({ page }) => {
    await deletePipeline(page, pipelineName);
  });

  test('should increase the panel height when the handle is dragged up', async ({ page }) => {
    const panel = page.getByTestId('pipeline-execution-panel');
    const handle = page.getByTestId('execution-drag-handle');

    const initialBox = await panel.boundingBox();
    const initialHeight = initialBox?.height || 0;

    // Hover the handle, press down, and move the mouse 200px UP (negative Y)
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x + (initialBox!.width / 2), initialBox!.y - 200);
    await page.mouse.up();

    const finalBox = await panel.boundingBox();
    expect(finalBox!.height).toBeGreaterThan(initialHeight);
    expect(finalBox!.height).toBeGreaterThanOrEqual(initialHeight + 150);
  });

  test('should snap to collapsed height when dragged below the threshold', async ({ page }) => {
    const panel = page.getByTestId('pipeline-execution-panel');
    const handle = page.getByTestId('execution-drag-handle');

    const initialBox = await panel.boundingBox();
    const viewportHeight = page.viewportSize()?.height || 0;

    // Drag the handle to the very bottom of the screen
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(initialBox!.x, viewportHeight - 10); 
    await page.mouse.up();

    const finalBox = await panel.boundingBox();
    expect(finalBox!.height).toBe(COLLAPSED_PANEL_HEIGHT);
  });

  test('should collapse logs via toggle and persist after reload', async ({ page }) => {
    const toggle = page.getByTestId('hide-logs-toggle');
    const logs = page.getByTestId('pipeline-execution-panel');

    await toggle.click();

    await expect(logs).toHaveCSS('height', `${COLLAPSED_PANEL_HEIGHT}px`);
    const isHidden = await page.evaluate(() => 
      localStorage.getItem('pipeline_execution_hidden')
    );
    expect(isHidden).toBe('true');

    await page.reload();
    await expect(logs).toHaveCSS('height', `${COLLAPSED_PANEL_HEIGHT}px`);
  });

  test('should snap to maximum height when dragged near the top', async ({ page }) => {
    const panel = page.getByTestId('pipeline-execution-panel');
    const handle = page.getByTestId('execution-drag-handle');

    const viewportHeight = page.viewportSize()?.height || 0;
    
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(0, 0);
    await page.mouse.up();

    const finalBox = await panel.boundingBox();
    const estimatedMax = viewportHeight - ALL_HEADERS_HEIGHT; 
    
    expect(finalBox!.height).toBeGreaterThanOrEqual(estimatedMax);
  });

  test('should expand the panel when dragged while in hidden state', async ({ page }) => {
    const toggle = page.getByTestId('hide-logs-toggle');
    const panel = page.getByTestId('pipeline-execution-panel');
    const handle = page.getByTestId('execution-drag-handle');

    await toggle.click();
    await expect(panel).toHaveCSS('height', `${COLLAPSED_PANEL_HEIGHT}px`);

    const initialBox = await panel.boundingBox();
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(0, initialBox!.y - 100);
    await page.mouse.up();

    await expect(panel).not.toHaveCSS('height', `${COLLAPSED_PANEL_HEIGHT}px`);
    const isHidden = await page.evaluate(() => 
      localStorage.getItem('pipeline_execution_hidden')
    );
    expect(isHidden).toBe('false');
  });

  test('should maintain panel height when the browser window is resized', async ({ page }) => {
    const panel = page.getByTestId('pipeline-execution-panel');

    const initialBox = await panel.boundingBox();
    const heightBefore = initialBox?.height || 0;
    expect(heightBefore).toBeGreaterThan(0);

    const vp = page.viewportSize()!;
    await page.setViewportSize({ width: vp.width, height: vp.height - 200 });

    const heightAfter = (await panel.boundingBox())?.height;
    expect(heightAfter).toBe(heightBefore);

    await page.setViewportSize(vp);
  });

  test('should allow dragging immediately after toggling visibility', async ({ page }) => {
    const toggle = page.getByTestId('hide-logs-toggle');
    const panel = page.getByTestId('pipeline-execution-panel');
    const handle = page.getByTestId('execution-drag-handle');

    await toggle.click();
    await expect(panel).toHaveCSS('height', `${COLLAPSED_PANEL_HEIGHT}px`);

    await toggle.click();
    
    const box = await panel.boundingBox();
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(box!.x, box!.y - 100);
    await page.mouse.up();

    const finalBox = await panel.boundingBox();
    expect(finalBox!.height).toBeGreaterThan(box!.height);
  });
});
