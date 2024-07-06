import update from 'immutability-helper';

import { ZoomPanPositionType, ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { DragItem, LayoutConfigType, NodeItemType, NodeType, RectType, RectTransformationType } from '../interfaces';
import { LayoutConfigDirectionEnum, LayoutConfigDirectionOriginEnum, TransformRectTypeEnum, RectTransformationScopeEnum } from '../types';
import { range, indexBy, flattenArray } from '@utils/array';
import { isDebug as isDebugBase } from '@utils/environment';
import { validateFiniteNumber } from '@utils/number';
import { DEBUG } from '@components/v2/utils/debug';

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

export function transformRects(rectsInit: RectType[], transformations: RectTransformationType[]): RectType[] {
  DEBUG.rects && console.log('transformRects', transformations, rectsInit);
  const rectsByStage = [rectsInit];

  transformations.forEach((transformation, stage: number) => {
    const {
      condition,
      initialScope,
      options,
      scope,
      targets,
      transform,
      type,
    } = transformation;

    let rects = [...rectsByStage[rectsByStage.length - 1]];

    const opts = options ? options?.(rects) : {};
    const { layout, layoutOptions, offset, padding, rect: defaultRect } = opts || {};
    const { parent } = rects?.[0] ?? {};

    const scopeLog = scope || (initialScope ? `initial=${initialScope}` : null) || 'all';
    const tag = `${stage}:${scopeLog}:${type}`;
    const tags = [opts, transformation];
    DEBUG.rects && console.log(`${tag}:start`, ...tags, rects);

    if (targets) {
      rects = targets(rects);
    }

    if (!rects?.length) {
      rectsByStage.push(rects);
      return rects;
    }

    if (condition && !condition(rects)) {
      rectsByStage.push(rects);
      DEBUG.rects && console.log(`${tag}:condition not met`, ...tags, rects);
      rectsByStage.push(rects);
      return rects;
    }

    if (RectTransformationScopeEnum.CHILDREN === scope) {
      const arr = [];
      rects.forEach((rect) => {
        const rectChildren = [...(rect.children || [])] || [];
        const count1 = rectChildren?.length;

        const rc = rectChildren?.map(rectChild => ({
          ...rectChild,
          parent: rect,
        }));

        rect.children = transformRects(rc, [{
          ...transformation,
          initialScope: scope,
          scope: undefined,
        }]);
        if (rect.children?.length !== count1) {
          throw new Error(
            `Rect ${rect.id} started with ${count1} ` +
            `children but ended with ${rect.children?.length} children after transformation.`,
          );
        }
        arr.push(rect);
      });
      rects = arr;
    } else if (RectTransformationScopeEnum.SELF === scope) {
      rects = rects?.map((rect) => ({
        ...rect,
        ...transformRects([rect], [{
          ...transformation,
          scope: undefined,
        }])[0],
      }));
    } else if (TransformRectTypeEnum.RESET === type) {
      rects = rects.map((rect) => ({
        ...rect,
        height: 0,
        width: 0,
      }));
    } else if (TransformRectTypeEnum.LAYOUT_TREE === type) {
      rects = layoutRectsInTreeFormation(rects, layout ?? {});
    } else if (TransformRectTypeEnum.LAYOUT_WAVE === type) {
      rects = layoutRectsInWavePattern(rects, layout, layoutOptions);
    } else if (TransformRectTypeEnum.LAYOUT_RECTANGLE === type) {
      rects = groupRectangles(rects, layout);
    } else if (TransformRectTypeEnum.LAYOUT_GRID === type) {
      rects = layoutRectsInGrid(rects, layout);
    } else if (TransformRectTypeEnum.LAYOUT_SPIRAL === type) {
      rects = layoutRectsInSpiral(rects, layout, layoutOptions);
    } else if (TransformRectTypeEnum.SHIFT_INTO_PARENT === type && parent) {
      rects = shiftRectsIntoBoundingBox(rects, parent);
    } else if (TransformRectTypeEnum.ALIGN_CHILDREN === type) {
      rects = rects.map((rect) => {
        const { parent } = rect;
        const diff = {
          left: (validateFiniteNumber(parent?.offset?.left) ?? 0)
            + (validateFiniteNumber(parent?.padding?.left) ?? 0),
          top: (validateFiniteNumber(parent?.offset?.top) ?? 0)
            + (validateFiniteNumber(parent?.padding?.top) ?? 0),
        };

        return applyRectDiff(rect, diff);
      });
    } else if (TransformRectTypeEnum.FIT_TO_CHILDREN === type) {
      rects = rects.map((rect) => {
        const box = calculateBoundingBox(rect?.children?.length >= 1 ? rect.children : [rect]);

        return {
          ...rect,
          height: validateFiniteNumber(box.height)
            + validateFiniteNumber(padding?.top ?? 0)
            + validateFiniteNumber(padding?.bottom ?? 0)
            + validateFiniteNumber(offset?.top ?? 0),
          offset,
          padding,
          width: validateFiniteNumber(box.width)
            + validateFiniteNumber(padding?.left ?? 0)
            + validateFiniteNumber(padding?.right ?? 0)
            + validateFiniteNumber(offset?.left ?? 0),
        };
      });
    } else if (TransformRectTypeEnum.PAD === type) {
      rects = rects.map((rect) => ({ ...rect, padding }));
    } else if (TransformRectTypeEnum.SHIFT === type) {
      rects = shiftRectsByDiffRect(rects, offset ?? { left: 0, top: 0 });
    } else if (TransformRectTypeEnum.MIN_DIMENSIONS === type) {
      rects = rects.map(rect => {
        const height1 = validateFiniteNumber(rect.height);
        const width1 = validateFiniteNumber(rect.width);
        const heightd = validateFiniteNumber(defaultRect?.height ?? 0);
        const widthd = validateFiniteNumber(defaultRect?.width ?? 0);

        return {
          ...rect,
          height: height1 < heightd ? heightd : height1,
          width: width1 < widthd ? widthd : width1,
        };
      });
    } else if (transform) {
      rects = transform(rects);
    }

    DEBUG.rects && console.log(`${tag}:end`, ...tags, rects);

    rectsByStage.push(rects);
  });

  const stage = rectsByStage.length - 1;
  const results = rectsByStage[stage];
  const rectsPrev = rectsByStage[stage - 1];

  if (rectsByStage.length >= 2) {
    results?.forEach((rect, idx) => {
      const rectp = rectsPrev[idx];

      if (rect.children?.length !== rectp.children?.length) {
        throw new Error(
          `Rect ${rect.id} started with ${rectp?.children?.length} ` +
          `children but ended with ${rect?.children?.length} children after transformation ` +
          `going from stage ${stage - 1} to stage ${stage}`,
        );
      }
    });
  }

  return results;
}

function shiftRectsIntoBoundingBox(rects: RectType[], boundingBox: RectType): RectType[] {
  // This function shifts a list of rectangles to fit within a specified bounding box.
  const groupBoundingBox = calculateBoundingBox(rects);

  const offsetX = validateFiniteNumber(boundingBox.left) - validateFiniteNumber(groupBoundingBox.left);
  const offsetY = validateFiniteNumber(boundingBox.top) - validateFiniteNumber(groupBoundingBox.top);

  return rects.map(rect => ({
    ...rect,
    left: validateFiniteNumber(rect.left) + validateFiniteNumber(offsetX),
    top: validateFiniteNumber(rect.top) + validateFiniteNumber(offsetY),
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
  const { height, width } = getRectsFromLayout(layout)?.containerRect || { height: 0, width: 0 };
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
      upstream:
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
  const { boundingRect, containerRect } = getRectsFromLayout(layout || {});

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

    if (item.upstream.length === 0) {
      isDebug() && console.log(`Item ${item.id} has no upstream:`, item?.upstream);
      levels.set(item.id, 0);
    } else {
      const lvl = Math.max(
        ...item.upstream.map(rect => {
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
  const dl = dimensions ? (validateFiniteNumber(rect.width) + validateFiniteNumber(diff.width)) / 4 : validateFiniteNumber(diff.left);
  const dt = dimensions ? (validateFiniteNumber(rect.height) + validateFiniteNumber(diff.height)) / 4 : validateFiniteNumber(diff.top);

  return {
    ...rect,
    left: validateFiniteNumber(rect.left) + validateFiniteNumber(dl),
    top: validateFiniteNumber(rect.top) + validateFiniteNumber(dt),
  };
}

function layoutRectsInGrid(rects: RectType[], layout?: LayoutConfigType): RectType[] {
  const { gap, direction = LayoutConfigDirectionEnum.HORIZONTAL } = layout || {};
  const { containerRect } = getRectsFromLayout(layout || {});
  const rectsCopy = [...rects];
  let currentX = 0;
  let currentY = 0;
  let maxRowHeight = 0;
  let maxColWidth = 0;
  const positionedRects: RectType[] = [];

  for (const rect of rectsCopy) {
    if (direction === LayoutConfigDirectionEnum.HORIZONTAL) {
      // If the current rect goes beyond the container width, move to the next row
      if (currentX + rect.width > containerRect.width) {
        currentX = 0;
        currentY += maxRowHeight + gap.row;
        maxRowHeight = 0;
      }

      // Position the rect
      positionedRects.push({
        ...rect,
        left: currentX,
        top: currentY,
      });

      // Update currentX and maxRowHeight for next rect
      currentX += rect.width + gap.column;
      maxRowHeight = Math.max(maxRowHeight, rect.height);
    } else {
      // If the current rect goes beyond the container height, move to the next column
      if (currentY + rect.height > containerRect.height) {
        currentY = 0;
        currentX += maxColWidth + gap.column;
        maxColWidth = 0;
      }

      // Position the rect
      positionedRects.push({
        ...rect,
        left: currentX,
        top: currentY,
      });

      // Update currentY and maxColWidth for next rect
      currentY += rect.height + gap.row;
      maxColWidth = Math.max(maxColWidth, rect.width);
    }
  }

  return positionedRects;
}

export function getMaxOffset() {

}

function layoutItemsInNodeGroup(nodes: NodeType[], layout: LayoutConfigType) {
  const groupsMapping: Record<string, NodeType> = {};

  const {
    node: transformRect = (rect: RectType) => ({ ...rect }) as RectType,
  } = layout?.transformRect || {};
  const {
    item: defaultRect = (item: NodeItemType) => ({ ...item?.rect }) as RectType,
  } = layout?.defaultRect || {};

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

  return Object.values(groupsMapping || {});
}

function convertUpstreamNodesToUpstreamRects(nodes: NodeItemType[]) {
  const groupsMapping = indexBy(nodes, node => node.id);

  return Object.values(groupsMapping || {}).map((node: NodeType) => ({
    ...node,
    rect: {
      ...node?.rect,
      upstream: (node.upstream ?? []).reduce((acc: RectType[], nodeID: string) => {
        const rect = groupsMapping[nodeID]?.rect;
        return rect ? acc.concat({ ...rect, id: nodeID }) : acc;
      }, []),
    },
  }));
}

function convertItemsToRects(items: NodeItemType[]): RectType[] {
  return items?.map((item: NodeItemType) => ({
    ...item.rect,
    id: item?.id,
    upstream: item?.rect?.upstream?.map((rect: RectType) => rect),
  }));
}

function clearnPositionsForRects(rects: RectType[]) {
  // Reset position to nothing; clean state.
  return rects?.map((rect: RectType) => ({
    ...rect,
    left: null,
    top: null,
    upstream: rect?.upstream?.map((rect: RectType) => ({
      ...rect,
      left: null,
      top: null,
    })),
  }));
}

function centerRectsInBoundingBox(rects: RectType[], box: RectType): RectType[] {
  const boxSmall = calculateBoundingBox(rects);

  const offsetTop = (box.height - boxSmall.height) / 2;
  const offsetLeft = (box.width - boxSmall.width) / 2;
  console.log(box, boxSmall, offsetTop, offsetLeft);
  return rects.map(rect => applyRectDiff(rect, {
    left: offsetLeft,
    top: offsetTop,
  }));
}

function shiftRectsByDiffRect(rects: RectType[], rectDiff: RectType) {
  return rects.map(rect => applyRectDiff(rect, rectDiff));
}

function addPaddingToRectInsideBox(rects: RectType[], box: RectType, pad: {
  bottom: number;
  left: number;
  right: number;
  top: number;
}) {
  return rects?.map((rect: RectType) => ({
    ...rect,
    left: Math.min(
      ((box.left ?? 0) + box.width) - pad.right,
      Math.max((box.left ?? 0) + pad.left, rect.left),
    ),
    top: Math.min(
      ((box.top ?? 0) + box.height) - pad.bottom,
      Math.max((box.top ?? 0) + pad.top, rect.top),
    ),
  }));
}

function layoutRectsInSpiral(rects: RectType[], layout?: LayoutConfigType, layoutOptions?: LayoutOptionsType): RectType[] {
  const { gap, direction } = layout || {};
  const { initialAngle = 0, angleStep = Math.PI / 8 } = layoutOptions || {};
  const { containerRect } = getRectsFromLayout(layout || {});

  const rectsCopy = [...rects];
  const halfWidth = containerRect.width / 2;
  const halfHeight = containerRect.height / 2;

  let angle = initialAngle; // Initial angle in radians
  const stepSize = Math.max(gap?.row || gap?.column || 20); // Base increment for radius

  let radius = stepSize; // Initial radius
  const positionedRects: RectType[] = [];

  const horizontalAspectRatio = 1.5; // Moderate horizontal elongation
  const verticalAspectRatio = 1 / horizontalAspectRatio; // Moderate vertical elongation

  rectsCopy.forEach((rect) => {
    let x: number;
    let y: number;
    let overlap: boolean;
    let left: number;
    let top: number;

    do {
      // Calculate the elongated position based on angle and radius
      x = radius * Math.cos(angle) * (direction === LayoutConfigDirectionEnum.HORIZONTAL ? horizontalAspectRatio : verticalAspectRatio);
      y = radius * Math.sin(angle) * (direction === LayoutConfigDirectionEnum.VERTICAL ? horizontalAspectRatio : verticalAspectRatio);

      left = Math.max(0, halfWidth + x - rect.width / 2);
      top = Math.max(0, halfHeight + y - rect.height / 2);

      overlap = positionedRects.some((posRect) => {
        return !(left + rect.width < posRect.left || left > posRect.left + posRect.width || top + rect.height < posRect.top || top > posRect.top + posRect.height);
      });

      if (overlap || left < 0 || top < 0) {
        // If there is overlap or the rect goes out of bounds, adjust the angle and radius
        angle += angleStep;
        radius += stepSize;
      } else {
        // Otherwise, add the rect to the positionedRects
        positionedRects.push({
          ...rect,
          left,
          top,
        });
      }
    } while (overlap);
  });

  return positionedRects;
}

function moveItemsIntoNode(node) {
  const rects = shiftRectsIntoBoundingBox(node.items.map(i => i.rect), node.rect);
  return {
    ...node,
    items: rects.map((rect, idx) => ({ ...node.items[idx], rect })),
  };
}

function alignItemsInsideNode(node) {
  const diff = {
    left: (node.rect?.offset?.left ?? 0) + (node.rect?.padding?.left ?? 0),
    top: (node.rect?.offset?.top ?? 0) + (node.rect?.padding?.top ?? 0),
  };
  return {
    ...node,
    items: node.items.map(item => ({
      ...item,
      rect: applyRectDiff({ ...item.rect }, diff),
    })),
  };
}

export function layoutItemsInGroups(nodes: NodeType[], layout: LayoutConfigType): NodeType[] {
  const {
    // offsetRectFinal,
    // padRect,
    // shiftRect,
  } = layout;
  const { boundingRect, containerRect } = getRectsFromLayout(layout);

  let nodes2 = layoutItemsInNodeGroup(nodes, layout);
  nodes2 = convertUpstreamNodesToUpstreamRects(nodes2);
  let rects2 = convertItemsToRects(nodes2);

  // Doesn’t look good when there are too few groups and they have little dependency on each other
  rects2 = layoutRectsInTreeFormation(rects2, layout);
  // rects2 = layoutRectsInWavePattern(rects2, layout); // Best for low count
  // rects2 = centerRectsInBoundingBox(rects2, boundingRect); // Centers a lot
  // rects2 = shiftRectsByDiffRect(rects2, shiftRect); // Centers a lot
  // rects2 = addPaddingToRectInsideBox(rects2, boundingRect, padRect);
  // rects2 = groupRectangles(rects2); // Places them tightly together side by side
  // rects2 = layoutRectsInGrid(rects2, layout); // Same as group rectangles
  // rects2 = layoutRectsInSpiral(rects2, layout);

  const node3: NodeType[] = rects2.map((rect: RectType, idx1) => {
    const node = nodes2[idx1];

    // Move into parent
    node.items = moveItemsIntoNode({ ...node, rect }).items;

    // Align within parent
    node.items = alignItemsInsideNode(node).items;

    return {
      ...node,
      items: node.items?.map((item: DragItem) => ({
        ...item,
        node: {
          ...node,
          items: node.items?.map(() => ({
            id: item?.id,
            rect: item?.rect,
          })),
        },
      })),
      rect,
      // rect: applyRectDiff(rect, offsetRectFinal ?? {}),
    } as NodeType;
  });

  return node3;
}

function updateItemRect(item: DragItem, rect: RectType) {
  return update(item, {
    rect: {
      $merge: rect,
    },
  });
}

function groupRectangles(
  rects: RectType[],
  layout?: LayoutConfigType,
): RectType[] {
  const {
    gap,
    grid,
  } = layout || {};
  const horizontalSpacing: number = gap?.column ?? 10;
  const verticalSpacing: number = gap?.row ?? 10;
  let numCols: number = grid?.columns ?? null;
  let numRows: number = grid?.rows ?? null;

  if (!numRows && !numCols) {
    numRows = Math.ceil(Math.sqrt(rects.length)); // If neither numRows nor numCols are provided, calculate them based on the number of rects
    numCols = Math.ceil(rects.length) / numRows;
  }
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

export function calculateBoundingBox(rects: RectType[]): RectType {
  if (rects.length === 0) {
    return { left: 0, top: 0, width: 0, height: 0 };
  }

  const minLeft = Math.min(...rects.map(rect => validateFiniteNumber(rect.left)));
  const minTop = Math.min(...rects.map(rect => validateFiniteNumber(rect.top)));
  const maxRight = Math.max(...rects.map(rect => validateFiniteNumber(rect.left) + (validateFiniteNumber(rect.width) ?? 0)));
  const maxBottom = Math.max(...rects.map(rect => validateFiniteNumber(rect.top) + (validateFiniteNumber(rect.height) ?? 0)));

  const width = validateFiniteNumber(maxRight - minLeft);
  const height = validateFiniteNumber(maxBottom - minTop);

  return {
    height: validateFiniteNumber(height),
    left: validateFiniteNumber(minLeft),
    top: validateFiniteNumber(minTop),
    width: validateFiniteNumber(width),
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

function getRectsFromLayout(layout: LayoutConfigType): {
  boundingRect: DOMRect | RectType;
  containerRect: DOMRect | RectType;
} {
  const { containerRef, viewportRef } = layout || {};

  const boundingRect = viewportRef?.current?.getBoundingClientRect() ?? {
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    left: 0,
    top: 0,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
  };
  const containerRect = containerRef?.current?.getBoundingClientRect() ?? {
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    left: 0,
    top: 0,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
  };

  return {
    boundingRect,
    containerRect,
  };
}

export function findRectAtPoint(x, y, rects) {
  return rects.find(({ left, top, width, height }) => x >= left && x <= left + width && y >= top && y <= top + height);
}
