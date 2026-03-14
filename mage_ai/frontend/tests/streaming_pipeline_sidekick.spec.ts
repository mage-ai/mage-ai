import { expect, test } from './base';
import {
  createStreamingPipeline,
  deletePipeline,
  navigateToTreeView,
} from './utils';

test.describe('streaming pipeline sidekick', () => {
  let pipelineName: string;

  test.beforeEach(async ({ page }) => {
    pipelineName = await createStreamingPipeline(page);
    await navigateToTreeView(page);
  });

  test.afterEach(async ({ page }) => {
    await deletePipeline(page, pipelineName);
  });

  test('T1 — default state: tree and output both visible', async ({ page }) => {
    // Container uses height:0 until useWindowSize resolves — check bounding box directly.
    const container = page.locator('[data-testid="dependency-graph-container"]');
    const box = await container.boundingBox();
    expect(box).not.toBeNull();
    expect(box.height).toBeGreaterThan(0);

    await expect(page.getByRole('button', { name: 'Execute pipeline' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide tree' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide output' })).toBeVisible();
  });

  test('T2 — hide tree: container aria-hidden, button becomes "Show tree"', async ({ page }) => {
    await page.getByRole('button', { name: 'Hide tree' }).click();

    const container = page.locator('[data-testid="dependency-graph-container"]');
    await expect(container).toHaveAttribute('aria-hidden', 'true');
    await expect(page.getByRole('button', { name: 'Show tree' })).toBeVisible();
  });

  test('T3 — show tree: container restored, button becomes "Hide tree"', async ({ page }) => {
    // Drive to hidden state first.
    await page.getByRole('button', { name: 'Hide tree' }).click();
    const container = page.locator('[data-testid="dependency-graph-container"]');
    await expect(container).toHaveAttribute('aria-hidden', 'true');

    // Restore.
    await page.getByRole('button', { name: 'Show tree' }).click();
    await expect(container).toHaveAttribute('aria-hidden', 'false');
    await expect(page.getByRole('button', { name: 'Hide tree' })).toBeVisible();
    // Height should be positive again (useWindowSize already resolved at this point).
    await expect(async () => {
      const box = await container.boundingBox();
      expect(box).not.toBeNull();
      expect(box.height).toBeGreaterThan(0);
    }).toPass({ timeout: 5000 });
  });

  test('T4 — hide output: output container removed, button becomes "Show output"', async ({ page }) => {
    await page.getByRole('button', { name: 'Hide output' }).click();

    // OutputContainerStyle is conditionally rendered — fully removed from DOM when hidden.
    await expect(page.locator('[data-testid="pipeline-execution-output"]')).not.toBeAttached();
    await expect(page.getByRole('button', { name: 'Show output' })).toBeVisible();
  });

  test('T5 — show output: output container restored, button becomes "Hide output"', async ({ page }) => {
    // Drive to hidden state first.
    await page.getByRole('button', { name: 'Hide output' }).click();
    await expect(page.locator('[data-testid="pipeline-execution-output"]')).not.toBeAttached();

    // Restore.
    await page.getByRole('button', { name: 'Show output' }).click();
    await expect(page.locator('[data-testid="pipeline-execution-output"]')).toBeAttached();
    await expect(page.getByRole('button', { name: 'Hide output' })).toBeVisible();
  });

  test('T6 — both hidden: "Everything is hidden!" screen with recovery buttons', async ({ page }) => {
    await page.getByRole('button', { name: 'Hide tree' }).click();
    await page.getByRole('button', { name: 'Hide output' }).click();

    await expect(page.getByText('Everything is hidden!')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show tree' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Show output' })).toBeVisible();
    // Graph container is still in DOM but aria-hidden.
    await expect(page.locator('[data-testid="dependency-graph-container"]')).toHaveAttribute('aria-hidden', 'true');
    // Output container is fully removed (conditionally rendered).
    await expect(page.locator('[data-testid="pipeline-execution-output"]')).not.toBeAttached();
  });

  test('T7 — recovery via "Show tree": graph restored, everything-hidden screen gone', async ({ page }) => {
    await page.getByRole('button', { name: 'Hide tree' }).click();
    await page.getByRole('button', { name: 'Hide output' }).click();
    await expect(page.getByText('Everything is hidden!')).toBeVisible();

    await page.getByRole('button', { name: 'Show tree' }).click();

    await expect(page.getByText('Everything is hidden!')).not.toBeVisible();
    const container = page.locator('[data-testid="dependency-graph-container"]');
    await expect(container).toHaveAttribute('aria-hidden', 'false');
    await expect(async () => {
      const box = await container.boundingBox();
      expect(box).not.toBeNull();
      expect(box.height).toBeGreaterThan(0);
    }).toPass({ timeout: 5000 });
  });

  test('T8 — recovery via "Show output": output restored, everything-hidden screen gone', async ({ page }) => {
    await page.getByRole('button', { name: 'Hide tree' }).click();
    await page.getByRole('button', { name: 'Hide output' }).click();
    await expect(page.getByText('Everything is hidden!')).toBeVisible();

    await page.getByRole('button', { name: 'Show output' }).click();

    await expect(page.getByText('Everything is hidden!')).not.toBeVisible();
    await expect(page.locator('[data-testid="pipeline-execution-output"]')).toBeAttached();
    // Tree is still hidden after this recovery path.
    await expect(page.locator('[data-testid="dependency-graph-container"]')).toHaveAttribute('aria-hidden', 'true');
  });

  test('T9 — drag handle: present in DOM with cursor: row-resize', async ({ page }) => {
    const handle = page.locator('[data-testid="drag-handle"]');
    await expect(handle).toBeAttached();
    const cursor = await handle.evaluate(el => getComputedStyle(el).cursor);
    expect(cursor).toBe('row-resize');
  });

  test('T10 — drag up: output panel height increases', async ({ page }) => {
    const handle = page.locator('[data-testid="drag-handle"]');
    const output = page.locator('[data-testid="pipeline-execution-output"]');

    const handleBox = await handle.boundingBox();
    const outputBefore = (await output.boundingBox()).height;

    const cx = handleBox.x + handleBox.width / 2;
    const cy = handleBox.y + handleBox.height / 2;

    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 100, { steps: 10 });
    await page.mouse.up();

    const outputAfter = (await output.boundingBox()).height;
    expect(outputAfter).toBeGreaterThan(outputBefore);
  });

  test('T11 — localStorage: tree-hidden persists after page.reload()', async ({ page }) => {
    // Hide tree — handleSetTreeHidden writes pipeline_tree_hidden=true to localStorage.
    await page.getByRole('button', { name: 'Hide tree' }).click();
    await expect(page.locator('[data-testid="dependency-graph-container"]')).toHaveAttribute('aria-hidden', 'true');

    await page.reload();

    // After reload: treeHidden=true (from localStorage), hasEverShownTree=false
    // → dependency-graph-container is never rendered.
    // PipelineExecution still renders (pipelineExecutionHidden=false).
    await expect(page.getByRole('button', { name: 'Show tree' })).toBeVisible();
    await expect(page.locator('[data-testid="dependency-graph-container"]')).not.toBeAttached();
  });

  test('T12 — drag to top: graph height does not explode on release', async ({ page }) => {
    const handle = page.locator('[data-testid="drag-handle"]');
    const graph = page.locator('[data-testid="dependency-graph-container"]');

    const handleBox = await handle.boundingBox();
    const cx = handleBox.x + handleBox.width / 2;
    const cy = handleBox.y + handleBox.height / 2;
    const { height: viewportHeight } = page.viewportSize();

    // Drag all the way to the top of the viewport — this is the maximum upward
    // drag. Without the maxDelta clamp in useDragResize the outputHeight would
    // balloon to thousands of px on mouseup, causing the graph to flash to its
    // intrinsic DependencyGraph height (~10 000 px).
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, 0, { steps: 20 });
    await page.mouse.up();

    // Graph height must be clamped: ≥ 0 and well within the viewport.
    const graphBox = await graph.boundingBox();
    expect(graphBox.height).toBeGreaterThanOrEqual(0);
    expect(graphBox.height).toBeLessThanOrEqual(viewportHeight);
  });

  test('T13 — drag past viewport bottom: "Execute pipeline" header stays visible', async ({ page }) => {
    const handle = page.locator('[data-testid="drag-handle"]');

    const handleBox = await handle.boundingBox();
    const cx = handleBox.x + handleBox.width / 2;
    const cy = handleBox.y + handleBox.height / 2;
    const { height: viewportHeight } = page.viewportSize();

    // Drag well below the viewport — without the minDelta clamp the scroll
    // area would shrink past zero, pushing the OutputHeaderStyle off-screen.
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, viewportHeight + 200, { steps: 20 });
    await page.mouse.up();

    // The "Execute pipeline" button lives in OutputHeaderStyle which is
    // rendered unconditionally above the scrollable output area. It must
    // remain fully within the viewport after the most extreme downward drag.
    const executeButton = page.getByRole('button', { name: 'Execute pipeline' });
    await expect(executeButton).toBeVisible();
    const btnBox = await executeButton.boundingBox();
    expect(btnBox.y + btnBox.height).toBeLessThanOrEqual(viewportHeight);
  });

  test('T14 — execute pipeline: output visible and height-responsive to viewport resize', async ({ page }) => {
    const output = page.locator('[data-testid="pipeline-execution-output"]');

    // outputHeight is initialised from the OUTPUT_HEIGHT constant (not localStorage),
    // so it is always positive at page load.
    await page.getByRole('button', { name: 'Execute pipeline' }).click();

    const heightBefore = (await output.boundingBox()).height;
    expect(heightBefore).toBeGreaterThan(0);

    // Shrink viewport — outputHeight is stored in React state and is NOT tied
    // to viewport size, so the container must stay at the same positive height.
    const vp = page.viewportSize();
    await page.setViewportSize({ width: vp.width, height: vp.height - 200 });
    const heightShrunken = (await output.boundingBox()).height;
    expect(heightShrunken).toBeGreaterThan(0);
    expect(heightShrunken).toBe(heightBefore);

    // Restore — height should be exactly the same.
    await page.setViewportSize(vp);
    const heightRestored = (await output.boundingBox()).height;
    expect(heightRestored).toBe(heightBefore);
  });

  test('T15 — ref=0 regression: pseudo-hide → toggle → execute → drag cannot exceed viewport', async ({ page }) => {
    const handle = page.locator('[data-testid="drag-handle"]');
    const { height: viewportHeight } = page.viewportSize();

    // Step 1: drag to bottom — commits outputHeight to 0 (maxed downward clamp).
    const handleBox = await handle.boundingBox();
    const cx = handleBox.x + handleBox.width / 2;
    const cy = handleBox.y + handleBox.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, viewportHeight + 200, { steps: 20 });
    await page.mouse.up();

    // Step 2: toggle output off — outputScrollRef unmounts (offsetHeight can't be read).
    await page.getByRole('button', { name: 'Hide output' }).click();

    // Step 3: start executing — isPipelineExecuting = true; Execute button is in
    // OutputHeaderStyle which renders even when pipelineExecutionHidden = true.
    await page.getByRole('button', { name: 'Execute pipeline' }).click();

    // Step 4: toggle output back on — outputHeight is still 0 and the newly
    // mounted OutputContainerStyle has offsetHeight = 0, so
    // dragStartScrollHeightRef = 0 and minDelta = 0 on the next mousedown.
    await page.getByRole('button', { name: 'Show output' }).click();

    // Step 5: attempt to drag past viewport again.
    // The minDelta = 0 case means delta is clamped to 0 for downward drags;
    // dragDelta stays 0 so the handle's visual position does not move.
    const newHandleBox = await handle.boundingBox();
    const ncx = newHandleBox.x + newHandleBox.width / 2;
    const ncy = newHandleBox.y + newHandleBox.height / 2;
    await page.mouse.move(ncx, ncy);
    await page.mouse.down();
    await page.mouse.move(ncx, viewportHeight + 200, { steps: 20 });
    await page.mouse.up();

    // Use the "Hide output" toggle (always visible in OutputHeaderStyle regardless
    // of isPipelineExecuting) rather than "Execute pipeline" which becomes hidden
    // while loading after step 3.
    const hideOutputBtn = page.getByRole('button', { name: 'Hide output' });
    await expect(hideOutputBtn).toBeVisible();
    const btnBox = await hideOutputBtn.boundingBox();
    expect(btnBox.y + btnBox.height).toBeLessThanOrEqual(viewportHeight);

    // The drag handle itself must not slip below the viewport.
    const finalHandleBox = await handle.boundingBox();
    expect(finalHandleBox.y + finalHandleBox.height).toBeLessThanOrEqual(viewportHeight);
  });

  test('T16 — state machine: pseudo hide tree → hide/show tree → hide/show output → return to default', async ({ page }) => {
    const handle = page.locator('[data-testid="drag-handle"]');
    const graph  = page.locator('[data-testid="dependency-graph-container"]');
    const output = page.locator('[data-testid="pipeline-execution-output"]');
    const { height: vph } = page.viewportSize();

    const graphH        = async () => (await graph.boundingBox())?.height ?? 0;
    const outputScrollH = async () => (await output.boundingBox())?.height ?? 0;
    const handleCursor  = async () => page.evaluate(
      () => window.getComputedStyle(document.querySelector('[data-testid="drag-handle"]')!).cursor,
    );
    const dragToY = async (y: number) => {
      const b = await handle.boundingBox();
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx, y, { steps: 20 });
      await page.mouse.up();
    };

    // Step 1 — default state
    expect(await graphH()).toBeGreaterThan(0);
    expect(await outputScrollH()).toBeGreaterThan(0);
    expect(await handleCursor()).toBe('row-resize');

    // Step 2 — pseudo hide tree: drag handle to top → graphH collapses to 0,
    // outputHeight absorbs all freed space.
    await dragToY(0);
    expect(await graphH()).toBeLessThanOrEqual(5);
    expect(await outputScrollH()).toBeGreaterThan(0);
    expect(await handleCursor()).toBe('row-resize');

    // Step 3 — actual Hide tree: dragHandleDisabled = true → cursor default.
    // A drag attempt must be a no-op (handleDragHandleMouseDown returns early).
    await page.getByRole('button', { name: 'Hide tree' }).click();
    await expect(graph).toHaveAttribute('aria-hidden', 'true');
    expect(await handleCursor()).toBe('default');
    const outputH3 = await outputScrollH();
    await dragToY(0);  // no-op — disabled
    expect(Math.abs(await outputScrollH() - outputH3)).toBeLessThanOrEqual(1);

    // Step 4 — Show tree: handle re-enabled; graphH still ≈ 0 because
    // outputHeight state from step 2 is unchanged.
    await page.getByRole('button', { name: 'Show tree' }).click();
    await expect(graph).not.toHaveAttribute('aria-hidden', 'true');
    expect(await graphH()).toBeLessThanOrEqual(5);
    expect(await handleCursor()).toBe('row-resize');

    // Step 5 — Hide output: dragHandleDisabled = true → cursor default.
    // Graph expands to fill the panel (no output area).
    // Drag attempt must be a no-op.
    await page.getByRole('button', { name: 'Hide output' }).click();
    expect(await handleCursor()).toBe('default');
    const graphH5 = await graphH();
    expect(graphH5).toBeGreaterThan(0);
    await dragToY(vph);  // no-op — disabled
    expect(Math.abs(await graphH() - graphH5)).toBeLessThanOrEqual(1);

    // Step 6 — Show output: handle re-enabled; graphH still ≈ 0 because
    // outputHeight is still at the large value set in step 2.
    await page.getByRole('button', { name: 'Show output' }).click();
    expect(await handleCursor()).toBe('row-resize');
    expect(await graphH()).toBeLessThanOrEqual(5);
    expect(await outputScrollH()).toBeGreaterThan(0);

    // Step 7 — Return to default: handle is at the TOP of the content area
    // (graphH ≈ 0 → maxDelta = 0 blocks upward drag). Dragging DOWN shrinks
    // outputHeight and opens space for the graph.
    const b7 = await handle.boundingBox();
    const handleMidY7 = b7.y + b7.height / 2;
    await dragToY(handleMidY7 + 200);
    expect(await outputScrollH()).toBeGreaterThan(100);
    expect(await graphH()).toBeGreaterThan(0);
    expect(await handleCursor()).toBe('row-resize');
  });

  test('T17 — state machine: pseudo hide output → hide/show output → hide/show tree → return to default', async ({ page }) => {
    const handle = page.locator('[data-testid="drag-handle"]');
    const graph  = page.locator('[data-testid="dependency-graph-container"]');
    const output = page.locator('[data-testid="pipeline-execution-output"]');
    const { height: vph } = page.viewportSize();

    const graphH        = async () => (await graph.boundingBox())?.height ?? 0;
    const outputScrollH = async () => (await output.boundingBox())?.height ?? 0;
    const handleCursor  = async () => page.evaluate(
      () => window.getComputedStyle(document.querySelector('[data-testid="drag-handle"]')!).cursor,
    );
    // "Execute pipeline" is always visible in T17 (never clicked → never loading).
    const headerTop = async () =>
      (await page.getByRole('button', { name: 'Execute pipeline' }).boundingBox())?.y ?? 0;
    const dragToY = async (y: number) => {
      const b = await handle.boundingBox();
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx, y, { steps: 20 });
      await page.mouse.up();
    };

    // Step 1 — default state
    const headerTopAtDefault = await headerTop();
    expect(await graphH()).toBeGreaterThan(0);
    expect(await outputScrollH()).toBeGreaterThan(0);
    expect(await handleCursor()).toBe('row-resize');

    // Step 2 — pseudo hide output: drag handle to bottom → outputScrollH ≈ 0,
    // graph absorbs all freed space.
    await dragToY(vph + 200);
    expect(await outputScrollH()).toBeLessThanOrEqual(5);
    expect(await graphH()).toBeGreaterThan(0);
    const headerTopAtPseudoHide = await headerTop();

    // Step 3 — Hide output (scroll already ≈ 0 → no visual jump in header).
    // pipelineExecutionHidden flips to true; both finalOutputHeight values are
    // equal when outputHeight ≈ 0, so the header y-position must not change.
    const htBefore3 = await headerTop();
    await page.getByRole('button', { name: 'Hide output' }).click();
    const htAfter3 = await headerTop();
    expect(Math.abs(htAfter3 - htBefore3)).toBeLessThanOrEqual(2);
    expect(await handleCursor()).toBe('default');

    // Step 4 — Attempt drag while disabled — no-op; graph stays large.
    // output is not in DOM (pipelineExecutionHidden = true), so only check graph.
    const graphH4 = await graphH();
    await dragToY(vph + 200);  // no-op — disabled
    expect(Math.abs(await graphH() - graphH4)).toBeLessThanOrEqual(1);

    // Step 5 — Show output (outputHeight still ≈ 0 → no visual jump in header).
    const htBefore5 = await headerTop();
    await page.getByRole('button', { name: 'Show output' }).click();
    const htAfter5 = await headerTop();
    expect(Math.abs(htAfter5 - htBefore5)).toBeLessThanOrEqual(2);
    expect(await outputScrollH()).toBeLessThanOrEqual(5);
    expect(await handleCursor()).toBe('row-resize');

    // Step 6 — Hide tree: effectiveOutputHeight switches from outputHeight (≈ 0)
    // to the full panel formula → output fills the visible panel.
    // Header jumps to near the top of the panel (graph is display:none).
    await page.getByRole('button', { name: 'Hide tree' }).click();
    await expect(graph).toHaveAttribute('aria-hidden', 'true');
    expect(await outputScrollH()).toBeGreaterThan(0);
    expect(await headerTop()).toBeLessThan(headerTopAtDefault);
    expect(await handleCursor()).toBe('default');

    // Step 7 — Show tree: effectiveOutputHeight reverts to outputHeight (≈ 0);
    // header returns to its pseudo-hide position (within ±5 px).
    await page.getByRole('button', { name: 'Show tree' }).click();
    await expect(graph).not.toHaveAttribute('aria-hidden', 'true');
    expect(await graphH()).toBeGreaterThan(0);
    expect(await outputScrollH()).toBeLessThanOrEqual(5);
    expect(Math.abs(await headerTop() - headerTopAtPseudoHide)).toBeLessThanOrEqual(5);
    expect(await handleCursor()).toBe('row-resize');

    // Step 8 — Return to default: handle is at the BOTTOM of the content area
    // (graphH is large → maxDelta = large). Dragging UP grows outputHeight.
    const b8 = await handle.boundingBox();
    const handleMidY8 = b8.y + b8.height / 2;
    await dragToY(handleMidY8 - 200);
    expect(await outputScrollH()).toBeGreaterThan(100);
    expect(await graphH()).toBeGreaterThan(0);
    expect(await handleCursor()).toBe('row-resize');
  });
});
