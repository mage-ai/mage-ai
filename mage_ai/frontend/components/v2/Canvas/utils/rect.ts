import update from 'immutability-helper';

import { ZoomPanPositionType, ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { DragItem, LayoutConfigType, NodeItemType, NodeType, RectType } from '../interfaces';
import { LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum } from '../types';
import { range, indexBy, flattenArray } from '@utils/array';
import { isDebug as isDebugBase } from '@utils/environment';

function isDebug() {
  return isDebugBase() && false;
}

type GroupType = { items: DragItem[]; position: { left: number; top: number } };

const DEFAULT_LAYOUT_CONFIG: LayoutConfigType = {
  direction: LayoutConfigDirectionEnum.HORIZONTAL,
  gap: {
    column: 40,
    row: 40,
  },
  itemRect: {
    height: 100,
    left: 0,
    top: 0,
    width: 100,
  },
  origin: LayoutConfigDirectionOriginEnum.LEFT,
  stagger: 100,
};

export type SetupOpts = {
  groupBy?: (item: DragItem) => string;
  layout?: LayoutConfigType;
  level?: number;
};

function shiftRectsIntoBoundingBox(rects: RectType[], boundingBox: RectType): RectType[] {
  // This function shifts a list of rectangles to fit within a specified bounding box.
  const groupBoundingBox = calculateBoundingBox(rects);

  const offsetX = boundingBox.left - groupBoundingBox.left;
  const offsetY = boundingBox.top - groupBoundingBox.top;

  return rects.map(rect => ({
    ...rect,
    left: rect.left + offsetX,
    top: rect.top + offsetY,
  }));
}

export function layoutItems(items: DragItem[], opts?: SetupOpts): RectType[] {
  const blocks = items?.map(i => i?.block);
  const itemsByBlock = indexBy(items, i => i?.block?.uuid);

  const { groupBy, layout } = opts || {};

  const {
    direction = LayoutConfigDirectionEnum.HORIZONTAL,
    gap = {
      column: 40,
      row: 40,
    },
    itemRect = {
      height: 200,
      width: 300,
    },
  } = { ...DEFAULT_LAYOUT_CONFIG, ...layout };

  const positions: RectType[] = [];
  const levels: Record<string, number> = {};
  let maxLevel = 0;

  function determineLevel(item: DragItem): number {
    const block = item.block;
    if (levels[block.uuid] !== undefined) {
      return levels[block.uuid];
    }
    if (block.upstream_blocks.length === 0) {
      levels[block.uuid] = 0;
    } else {
      levels[block.uuid] = Math.max(
        ...block?.upstream_blocks?.map((upstreamId: string) => {
          const upstreamBlock = blocks.find(b => b.uuid === upstreamId);
          return upstreamBlock ? determineLevel(itemsByBlock[upstreamBlock?.uuid]) + 1 : 0;
        }),
      );
    }
    maxLevel = Math.max(maxLevel, levels[block.uuid]);
    return levels[block.uuid];
  }

  items.forEach(determineLevel);

  const groups: Record<string, GroupType> = {};

  if (groupBy) {
    items.forEach(item => {
      const groupKey = groupBy(item);
      if (!groups[groupKey]) {
        groups[groupKey] = { items: [], position: null };
      }
      groups[groupKey].items.push(item);
    });
  } else {
    groups['default'] = { items, position: { left: 0, top: 0 } };
  }

  const currentGroupOffset = { left: 0, top: 0 };
  const padding = 20; // Additional padding for groups

  Object.values(groups).forEach((group: GroupType) => {
    const groupBlocks = group.items.map(item => ({
      ...(item?.rect ?? itemRect),
      id: item.id,
      left: 0,
      top: 0,
    }));

    const groupedRects = groupRectangles(
      groupBlocks as RectType[],
      Math.max(gap?.column, gap?.row),
    );

    groupedRects.forEach(({ left, top, ...rect }) => {
      positions.push({
        ...(rect ?? itemRect),
        left: currentGroupOffset.left + left,
        top: currentGroupOffset.top + top,
      });
    });

    const groupWidth = Math.max(...groupedRects.map(rect => rect.left + rect.width));
    const groupHeight = Math.max(...groupedRects.map(rect => rect.top + rect.height));

    // Update the offset for the next group
    if (direction === LayoutConfigDirectionEnum.HORIZONTAL) {
      currentGroupOffset.left += groupWidth + Math.max(gap?.column, gap?.row) + padding;
      currentGroupOffset.top = 0; // Reset top position for horizontal row layout
    } else {
      currentGroupOffset.top += groupHeight + Math.max(gap?.column, gap?.row) + padding;
      currentGroupOffset.left = 0; // Reset left position for vertical column layout
    }
  });

  return positions;
}

export function layoutRectsInContainer(rects: RectType[], layout?: LayoutConfigType): RectType[] {
  // This function lays out items within a container by centering them.
  const { height, width } = layout?.containerRect || { height: 0, width: 0 };
  const rect = calculateBoundingBox(rects);
  const maxLeft = rect.left + rect.width;
  const maxTop = rect.top + rect.height;
  const offsetX = (width - (maxLeft - rect.left)) / 2;
  const offsetY = (height - (maxTop - rect.top)) / 2;

  return rects.map((rect: RectType) => ({
    ...rect,
    left: rect.left + offsetX,
    top: rect.top + offsetY,
  }));
}

function centerRects(
  rects: RectType[],
  boundingRect: RectType,
  containerRect: RectType,
): RectType[] {
  const centerRect = {
    left: (containerRect.left + containerRect.width) / 2 + (boundingRect.width ?? 0) / 2,
    top: (containerRect.top + containerRect.height) / 2 + (boundingRect.height ?? 0) / 2,
  };
  const centroid = calculateBoundingBox(rects);
  const diff = getRectDiff(centroid, centerRect);

  return rects.map(rect => applyRectDiff(rect, diff));
}

export function setUpstreamRectsForItems(items: DragItem[]): DragItem[] {
  isDebug() && console.log('setUpstreamRectsForItems', items);
  const rectsByItemID = indexBy(
    items.map(({ id, rect }) => ({ ...rect, id })),
    ({ id }) => id,
  );

  return items?.map((item: DragItem) => ({
    ...item,
    rect: {
      ...item.rect,
      id: item.id,
      upstreamRects:
        item?.block?.upstream_blocks.reduce(
          (acc: RectType[], id: string) => acc.concat(rectsByItemID[id] ?? []),
          [],
        ) ?? [],
    },
  }));
}

export function layoutItemsInTreeFormation(
  items: DragItem[],
  layout?: LayoutConfigType,
): DragItem[] {
  const { boundingRect, containerRect } = layout || {};

  const items2 = setUpstreamRectsForItems(items);
  let rects = items2.map(({ rect }) => rect);
  rects = layoutRectsInTreeFormation(rects, layout);

  if (containerRect && boundingRect) {
    // Very important or it’ll appear offscreen
    rects = centerRects(rects, boundingRect, containerRect);
  }

  const rectsMapping = indexBy(rects, ({ id }) => id);
  return items2.map((item: DragItem) => ({
    ...item,
    rect: rectsMapping[item.id],
  }));
}

function layoutRectsInTreeFormation(
  items: RectType[],
  layout?: LayoutConfigType,
  opts?: {
    align?: {
      horizontal?: 'left' | 'center' | 'right';
      vertical?: 'top' | 'center' | 'bottom';
    };
  },
): RectType[] {
  const { direction, gap, stagger } = { ...DEFAULT_LAYOUT_CONFIG, ...layout };
  const { column: gapCol, row: gapRow } = gap;

  const positionedItems: Record<number | string, RectType[]> = {};
  const levels: Map<number | string, number> = new Map();
  const maxLevelWidths: Map<number, number> = new Map();
  const maxLevelHeights: Map<number, number> = new Map();
  const childrenMapping: Map<RectType, RectType[]> = new Map();
  const visited = new Set<number | string>();

  // Determine the levels for each item
  function determineLevel(item: RectType): number {
    if (levels.has(item.id)) {
      return levels.get(item.id);
    }
    if (visited.has(item.id)) {
      throw new Error(`Cycle detected involving item id ${item.id}`);
    }
    visited.add(item.id);

    if (item.upstreamRects.length === 0) {
      isDebug() && console.log(`Item ${item.id} has no upstreamRects:`, item?.upstreamRects);
      levels.set(item.id, 0);
    } else {
      const lvl = Math.max(
        ...item.upstreamRects.map(rect => {
          const parentItem = items.find(i => i.id === rect.id);
          isDebug() && console.log(`Checking parent for ${item.id}`, parentItem);
          if (parentItem) {
            const parentLevel = determineLevel(parentItem);
            const children = childrenMapping.get(parentItem) || [];
            children.push(item);
            childrenMapping.set(parentItem, children);
            return parentLevel + 1;
          }
          return 0;
        }),
      );
      isDebug() && console.log(`Setting level for item ${item.id} to ${lvl}`);
      levels.set(item.id, lvl);
    }
    visited.delete(item.id);
    return levels.get(item.id);
  }

  items.forEach(determineLevel);

  // Collect items by level
  const levelItems: Map<number, RectType[]> = new Map();
  items.forEach(item => {
    const level = levels.get(item.id);
    if (!levelItems.has(level)) {
      levelItems.set(level, []);
    }
    levelItems.get(level).push(item);

    if (!maxLevelWidths.has(level)) {
      maxLevelWidths.set(level, 0);
      maxLevelHeights.set(level, 0);
    }

    // Track maximum dimensions at each level for centers calculation
    maxLevelWidths.set(level, Math.max(maxLevelWidths.get(level), item.width));
    maxLevelHeights.set(level, Math.max(maxLevelHeights.get(level), item.height));
  });

  const isHorizontal = direction === LayoutConfigDirectionEnum.HORIZONTAL;
  const dimensionsByLevel = [];

  // Position items level by level
  levelItems.forEach((rects: RectType[], level: number) => {
    const levelKey = String(level);
    // const mod = level % 3;
    // const factor = mod === 0 ? 0 : mod === 1 ? 1 : -1;
    // const offset = stagger * factor;

    rects.forEach((item, idx: number) => {
      let left = 0;
      let top = 0;

      if (isHorizontal) {
        range(level).forEach((_l, lvl: number) => {
          const increment = maxLevelWidths.get(lvl) + gapCol;
          isDebug() && console.log(`[${direction}] Adding left for ${item.id}:`, increment);
          left += increment;
        });
        isDebug() && console.log(`[${direction}] Left final for ${item.id}:`, left);
        item.left = left;

        top += rects.slice(0, idx).reduce((sum, rect) => sum + rect.height, 0) + idx * gapRow;

        // Zig-zag middle, right, left

        isDebug() && console.log(`[${direction}] Top for ${item.id}:`, top);
        item.top = top;
      } else {
        range(level).forEach((_l, lvl: number) => {
          const increment = maxLevelHeights.get(lvl) + gapRow;
          isDebug() && console.log(`[${direction}] Adding top for ${item.id}:`, increment);
          top += increment;
        });
        isDebug() && console.log(`[${direction}] Top final for ${item.id}:`, top);
        item.top = top;

        left += rects.slice(0, idx).reduce((sum, rect) => sum + rect.width, 0) + idx * gapCol;

        // Zig-zag center, down, up

        isDebug() && console.log(`Left for ${item.id}:`, left);
        item.left = left;
      }

      positionedItems[levelKey] ||= [];
      positionedItems[levelKey].push(item);
    });

    // Calculate total dimension for alignment within current level
    const rects2 = positionedItems[levelKey];
    dimensionsByLevel[levelKey] = calculateBoundingBox(rects2);
  });

  const maxHeight = Object.values(dimensionsByLevel).reduce(
    (max, rect) => Math.max(max, rect.height),
    0,
  );
  const maxWidth = Object.values(dimensionsByLevel).reduce(
    (max, rect) => Math.max(max, rect.width),
    0,
  );

  // Vertical:
  // - Align row horizontally
  // - Align row items vertically
  // Horizontal:
  // - Align column vertically
  // - Align column items horizontally
  levelItems.forEach((rects: RectType[], level: number) => {
    const levelKey = String(level);
    const rectLvl = dimensionsByLevel[levelKey];
    const maxDim = isHorizontal
      ? { top: rectLvl.top + (maxHeight - rectLvl.height) / 2 }
      : { left: rectLvl.left + (maxWidth - rectLvl.width) / 2 };
    const rectMax = { ...rectLvl, ...maxDim };
    const diff = getRectDiff(rectLvl, rectMax);

    isDebug() &&
      console.log(`[${direction}:${level}]`, 'rectLvl', rectLvl, 'rectMax', rectMax, 'diff', diff);
    const rects2 = rects.map(rect => applyRectDiff(rect, diff));

    // Align row items vertically / Align column items horizontally
    const maxDim2: {
      height?: number;
      width?: number;
    } = isHorizontal
      ? rects2.reduce((max, rect) => ({ width: Math.max(max.width, rect.width) }), { width: 0 })
      : rects2.reduce((max, rect) => ({ height: Math.max(max.height, rect.height) }), {
          height: 0,
        });
    const rects3 = rects2.map(rect => ({
      ...rect,
      left: isHorizontal ? rect.left + (maxDim2.width - rect.width) / 2 : rect.left,
      top: isHorizontal ? rect.top : rect.top + (maxDim2.height - rect.height) / 2,
    }));
    positionedItems[levelKey] = rects3;
  });

  // Center the entire layout within its container
  const rects = flattenArray(Object.values(positionedItems));
  const finalBoundingBox = calculateBoundingBox(rects);
  isDebug() && console.log('levelItems', levelItems, 'box', finalBoundingBox);

  const offsetX = opts?.align?.horizontal ? finalBoundingBox.left - finalBoundingBox.width / 2 : 0;
  const offsetY = opts?.align?.vertical ? finalBoundingBox.top - finalBoundingBox.height / 2 : 0;

  return rects.map((rect: RectType) => ({
    ...rect,
    left: rect.left - offsetX,
    top: rect.top - offsetY,
  }));
}

export function getRectDiff(rect1: RectType, rect2: RectType): RectType {
  const dx = rect2.left - rect1.left;
  const dy = rect2.top - rect1.top;
  const dw = rect2.width - rect1.width;
  const dh = rect2.height - rect1.height;

  return {
    height: dh,
    left: dx,
    top: dy,
    width: dw,
  };
}

export function applyRectDiff(rect: RectType, diff: RectType, dimensions?: boolean): RectType {
  const dl = dimensions ? (rect.width + diff.width) / 4 : diff.left;
  const dt = dimensions ? (rect.height + diff.height) / 4 : diff.top;

  return {
    ...rect,
    left: rect.left + dl,
    top: rect.top + dt,
  };
}

export function transformZoomPanRect(rect: RectType, transformState: ZoomPanStateType) {
  const { container, element, originX, originY, startX, startY } =
    transformState ?? ({} as ZoomPanStateType);

  const scale = transformState?.scale?.current ?? 1;

  const rectContainer = (container?.current ?? ({} as HTMLElement))?.getBoundingClientRect();
  const containerWidth = rectContainer.width;
  const containerHeight = rectContainer.height;

  const rectViewport = (element?.current ?? ({} as HTMLElement))?.getBoundingClientRect();
  const viewportWidth = rectViewport.width;
  const viewportHeight = rectViewport.height;

  const xCur = startX?.current ?? 0;
  const yCur = startY?.current ?? 0;

  const xOrg = originX?.current ?? 0;
  const yOrg = originY?.current ?? 0;

  const left = rect?.left ?? 0;
  const top = rect?.top ?? 0;
  const width = rect?.width ?? 0;
  const height = rect?.height ?? 0;

  const leftOrg = left + xOrg; // Reset before panning
  const leftFactor = xOrg / (viewportWidth - containerWidth);
  const transformedLeft = leftOrg;
  // + ((containerWidth - viewportWidth) * leftFactor);

  const topOrg = top + yOrg; // Reset before panning
  const topFactor = yOrg / (viewportHeight - containerHeight);
  const transformedTop = topOrg;
  // + ((containerHeight - viewportHeight) * topFactor);

  console.log('origin', xOrg, yOrg);
  console.log('current', xCur, yCur);
  console.log('factor', leftFactor, topFactor);
  console.log('scale', scale);
  console.log('leftTopOrg', leftOrg, topOrg);
  console.log('item', left, top);

  return {
    ...rect,
    height: height * scale,
    left: transformedLeft,
    top: transformedTop,
    width: width * scale,
  };
}

export function layoutItemsInGroups(nodes: NodeType[], layout: LayoutConfigType): NodeType[] {
  const { boundingRect, containerRect } = layout;
  const { node: transformRect = (rect: RectType) => ({ ...rect }) as RectType } =
    layout?.transformRect || {};
  const { item: defaultRect = (item: NodeItemType) => ({ ...item?.rect }) as RectType } =
    layout?.defaultRect || {};

  const groupsMapping: Record<string, NodeType> = {};

  nodes?.forEach((node: NodeType) => {
    const { items = [] } = node;

    const layoutInner = {
      ...layout,

      direction:
        LayoutConfigDirectionEnum.HORIZONTAL === layout.direction
          ? LayoutConfigDirectionEnum.VERTICAL
          : LayoutConfigDirectionEnum.HORIZONTAL,
    };
    const items2 = layoutItemsInTreeFormation(items, layoutInner);

    const offsetTopMax =
      items2?.length >= 1
        ? Math.max(
            ...items2.map(
              (item: DragItem) =>
                (item?.rect?.inner?.badge?.height ?? 0) +
                (item?.rect?.inner?.badge?.offset?.top ?? 0) +
                (item?.rect?.inner?.title?.height ?? 0) +
                (item?.rect?.inner?.title?.offset?.top ?? 0),
            ),
          )
        : 0;
    const offsetLeftMax =
      items2?.length >= 1
        ? Math.max(
            ...items2.map((item: DragItem) =>
              Math.max(
                item?.rect?.inner?.badge?.offset?.left ?? 0,
                item?.rect?.inner?.title?.offset?.left ?? 0,
              ),
            ),
          )
        : 0;

    false && isDebugBase() && console.log(items2, offsetTopMax, offsetLeftMax);

    const rectNode = addRects(defaultRect(node), transformRect(node?.rect) ?? ({} as RectType));

    const rectPadding = rectNode?.padding;
    const box1 = calculateBoundingBox(items2.map((item: DragItem) => item.rect));
    const box2 = {
      ...box1,
      height: Math.max(
        box1.height + (rectPadding?.top ?? 0) + (rectPadding?.bottom ?? 0) + (offsetTopMax ?? 0),
        defaultRect(node).height,
      ),
      offset: {
        left: offsetLeftMax,
        top: offsetTopMax,
      },
      padding: rectPadding,
      width: Math.max(
        box1.width + (rectPadding?.left ?? 0) + (rectPadding?.right ?? 0),
        defaultRect(node).width,
      ),
    };

    isDebug() &&
      console.log(
        node.id,
        'offsetTopMax',
        offsetTopMax,
        'items2',
        items2,
        'rectNode',
        rectNode,
        'itemsBox',
        box1,
        'itemsBoxPadding',
        box2,
      );

    groupsMapping[node.id] = {
      ...node,
      items: items2,
      rect: box2,
    };
  });

  Object.values(groupsMapping || {}).forEach((node: NodeType) => {
    groupsMapping[node.id] = {
      ...node,
      rect: {
        ...node?.rect,
        upstreamRects: (node.upstreamNodes ?? []).reduce((acc: RectType[], node2: NodeType) => {
          const rect = groupsMapping[node2.id]?.rect;
          return rect ? acc.concat({ ...rect, id: node2?.id }) : acc;
        }, []),
      },
    };
  });

  const rectsBeforeLayout = Object.values(groupsMapping || {})?.map((node: NodeType) => ({
    ...node.rect,
    id: node?.id,
    left: null,
    top: null,
    upstreamRects: node?.rect?.upstreamRects?.map((rect: RectType) => ({
      ...rect,
      left: null,
      top: null,
    })),
  }));

  isDebug() && console.log('rectsBeforeLayout', rectsBeforeLayout);

  const rectsInTree = layoutRectsInTreeFormation(rectsBeforeLayout, layout);
  isDebug() && console.log('rectsInTree', rectsInTree);

  // rectsInTree = rectsInTree?.map(rect => transformZoomPanRect(rect, transformState));

  // rectsInTree = centerRects(rectsInTree, boundingRect, containerRect);
  isDebug() &&
    console.log(
      'rectsInTree',
      rectsInTree,
      'boundingRect',
      boundingRect,
      'containerRect',
      containerRect,
      window.innerWidth,
      window.innerHeight,
    );

  return rectsInTree.reduce((acc, rect: RectType) => {
    const node = groupsMapping[rect.id];
    let items = node?.items ?? [];

    // items = items?.map((item: DragItem) => ({
    //   ...item,
    //   rect: applyRectDiff(item?.rect, {
    //     ...diff,
    //     left: diff.left + rectPadding.left,
    //     top: diff.top + rectPadding.top,
    //   }),
    // }));

    let itemsRects = items?.map((item: DragItem) => item.rect);
    itemsRects = shiftRectsIntoBoundingBox(itemsRects, rect);
    const itemsBox = calculateBoundingBox(itemsRects);
    const diff = {
      left: (rect?.offset?.left ?? 0) + (rect?.padding?.left ?? 0),
      top: (rect?.offset?.top ?? 0) + (rect?.padding?.top ?? 0),
    };

    isDebug() && console.log('box', rect, 'itemsBox', itemsBox, 'diff', diff);

    itemsRects = itemsRects.map((itemRect: RectType) => applyRectDiff(itemRect, diff));

    items = items?.map((item: DragItem, idx: number) => ({
      ...item,
      rect: itemsRects[idx],
    }));

    return acc.concat({
      ...node,
      items: items?.map((item: DragItem) => ({
        ...item,
        node: {
          ...node,
          items: items?.map(() => ({
            id: item?.id,
            rect: item?.rect,
          })),
        },
      })),
      rect,
    });
  }, []);
}

function updateItemRect(item: DragItem, rect: RectType) {
  return update(item, {
    rect: {
      $merge: rect,
    },
  });
}

function layoutItemsInSqaure(items: DragItem[], layout?: LayoutConfigType) {
  const rects = items.map(item => item.rect);
  const repositionedRects = repositionInGroup(rects, layout);

  return items.map((item, index) => {
    const { left, top } = repositionedRects[index];

    return updateItemRect(item, { ...item?.rect, left, top });
  });
}

function repositionInGroup(rects: RectType[], layout?: LayoutConfigType): RectType[] {
  const { gap, grid } = layout || {};
  let { columns: numCols, rows: numRows } = grid || {};
  const { column: horizontalSpacing = 50, row: verticalSpacing = 50 } = gap || {};

  // If there is only one rect, return it as is
  if (rects.length === 1) {
    return rects;
  }

  if (!numRows && !numCols) {
    numCols = Math.floor(Math.sqrt(rects.length));
    numRows = Math.ceil(rects.length / numCols); // If numRows is not provided, calculate it based on numCols
  } else {
    numCols = numCols ?? 1;
    numRows = numRows ?? 1;
  }

  let currentX = 0;
  let currentY = 0;
  let maxHeightInRow = 0;
  let colIdx = 0;

  // Calculate the bounding box of the original positions
  const centroid = calculateCentroid(rects);

  return rects.map((rect, index) => {
    if (colIdx >= numCols) {
      currentX = 0;
      currentY += maxHeightInRow + verticalSpacing;
      maxHeightInRow = 0;
      colIdx = 0;
    }

    const updatedRect = {
      ...rect,
      left: currentX - centroid.left,
      top: currentY - centroid.top,
    };

    currentX += rect.width + horizontalSpacing;
    if (rect.height > maxHeightInRow) {
      maxHeightInRow = rect.height;
    }

    colIdx += 1;

    return updatedRect;
  });
}

function groupRectangles(
  rects: RectType[],
  horizontalSpacing: number = 10,
  verticalSpacing: number = 10,
  numCols: number = 4,
  numRows?: number,
): RectType[] {
  if (!numRows) {
    numRows = Math.ceil(rects.length / numCols); // If numRows is not provided, calculate it based on numCols
  }

  let currentX = 0;
  let currentY = 0;
  let maxHeightInRow = 0;
  let colIdx = 0;

  return rects.map((rect, index) => {
    if (colIdx >= numCols) {
      currentX = 0;
      currentY += maxHeightInRow + verticalSpacing;
      maxHeightInRow = 0;
      colIdx = 0;
    }

    const updatedRect = {
      ...rect,
      left: currentX,
      top: currentY,
    };

    currentX += rect.width + horizontalSpacing;
    if (rect.height > maxHeightInRow) {
      maxHeightInRow = rect.height;
    }

    colIdx += 1;

    return updatedRect;
  });
}

function calculateCentroid(rects: RectType[]): { left: number; top: number } {
  let leftSum = 0;
  let topSum = 0;

  [...rects]?.forEach((rect: RectType) => {
    const { left, top, width, height } = { ...rect };
    leftSum += left + width / 2;
    topSum += top + height / 2;
  });

  return {
    left: leftSum / rects.length,
    top: topSum / rects.length,
  };
}

export function calculateBoundingBox(rects: RectType[]): RectType {
  if (rects.length === 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  const minLeft = Math.min(...rects.map(rect => rect.left));
  const minTop = Math.min(...rects.map(rect => rect.top));
  const maxRight = Math.max(...rects.map(rect => rect.left + (rect.width ?? 0)));
  const maxBottom = Math.max(...rects.map(rect => rect.top + (rect.height ?? 0)));

  const width = maxRight - minLeft;
  const height = maxBottom - minTop;

  return {
    height: height,
    left: minLeft,
    top: minTop,
    width: width,
  };
}

function layoutRectsInWavePattern(
  rects: RectType[],
  layout?: LayoutConfigType,
  opts?: {
    amplitude?: number;
    wavelength?: number;
  },
): RectType[] {
  const { amplitude = 40, wavelength = 100 } = opts || {};
  const { direction = LayoutConfigDirectionEnum.HORIZONTAL, gap } = layout || {};

  let accumulatedWidth = 0;
  let accumulatedHeight = 0;

  return rects.map((rect, index: number) => {
    let updatedRect: RectType;

    if (direction === LayoutConfigDirectionEnum.HORIZONTAL) {
      // Calculate wave positioning for horizontal direction
      const xPos = accumulatedWidth;
      const yPos = amplitude * Math.sin(((2 * Math.PI) / wavelength) * xPos);
      accumulatedWidth += rect.width + (gap?.column ?? 0);

      updatedRect = {
        ...rect,
        left: xPos,
        top: yPos,
      };
    } else {
      // Calculate wave positioning for vertical direction
      const yPos = accumulatedHeight;
      const xPos = amplitude * Math.sin(((2 * Math.PI) / wavelength) * yPos);
      accumulatedHeight += rect.height + (gap?.row ?? 0);

      updatedRect = {
        ...rect,
        left: xPos,
        top: yPos,
      };
    }

    return updatedRect;
  });
}

export function addRects(rect1: RectType, rect2: RectType): RectType {
  return {
    ...rect1,
    left: rect1.left + rect2.left,
    top: rect1.top + rect2.top,
  };
}

// export function getElementPositionInContainer(viewportRect, containerRect, initialElementRect) {
//   // Calculate the offset of the viewport within the container
//   const viewportOffsetX = viewportRect.left - containerRect.left;
//   const viewportOffsetY = viewportRect.top - containerRect.top;

//   // Calculate the absolute position of the element within the container
//   const elementXInContainer = initialElementRect.left + viewportOffsetX;
//   const elementYInContainer = initialElementRect.top + viewportOffsetY;

//   return {
//     left: elementXInContainer,
//     top: elementYInContainer,
//     width: initialElementRect.width,
//     height: initialElementRect.height,
//     offset: {
//       left: initialElementRect.left - viewportRect.left,
//       top: initialElementRect.top - viewportRect.top,
//     },
//   };
// }

export function getElementPositionInContainer(
  viewport: RectType,
  container: RectType,
  element: RectType,
): RectType {
  const containerOffsetLeft = container.left - viewport.left;
  const containerOffsetTop = container.top - viewport.top;

  const elementOffsetLeft = element.left - container.left;
  const elementOffsetTop = element.top - container.top;

  const absoluteLeft = containerOffsetLeft + elementOffsetLeft;
  const absoluteTop = containerOffsetTop + elementOffsetTop;

  return {
    height: element.height,
    left: absoluteLeft,
    offset: {
      left: elementOffsetLeft,
      top: elementOffsetTop,
    },
    top: absoluteTop,
    width: element.width,
  };
}
