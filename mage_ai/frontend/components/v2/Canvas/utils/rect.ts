import update from 'immutability-helper';

import BlockType from '@interfaces/BlockType';
import { DragItem, LayoutConfigType, RectType } from '../interfaces';
import {
  LayoutConfigDirectionEnum,
  LayoutConfigDirectionOriginEnum,
} from '../types';
import { flattenArray, indexBy, uniqueArray } from '@utils/array';

type GroupType = { items: DragItem[], position: { left: number; top: number } };

const DEFAULT_LAYOUT_CONFIG: LayoutConfigType = {
  direction: LayoutConfigDirectionEnum.HORIZONTAL,
  gap: {
    column: 40,
    row: 40,
  },
  itemRect: {
    left: 0,
    top: 0,
    height: 200,
    width: 300,
  },
  origin: LayoutConfigDirectionOriginEnum.LEFT,
};

export type SetupOpts = {
  groupBy?: (item: DragItem) => string;
  layout?: LayoutConfigType;
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

export function layoutItems(
  items: DragItem[],
  opts?: SetupOpts,
): RectType[] {
  const blocks = items?.map(i => i?.block);
  const itemsByBlock = indexBy(items, i => i?.block?.uuid);

  const {
    groupBy,
    layout,
  } = opts || {};

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
          const upstreamBlock = blocks.find((b) => b.uuid === upstreamId);
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
    items.forEach((item) => {
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

    const groupedRects = groupRectangles(groupBlocks as RectType[], Math.max(gap?.column, gap?.row));

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

export function layoutRectsInContainer(
  rects: RectType[],
  layout?: LayoutConfigType,
): RectType[] {
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

function centerRects(rects: RectType[], boundingRect: RectType, containerRect: RectType): RectType[] {
  const centerRect = {
    left: ((containerRect.left + containerRect.width) / 2) + ((boundingRect.width ?? 0) / 2),
    top: ((containerRect.top + containerRect.height) / 2) + ((boundingRect.height ?? 0) / 2),
  };
  const centroid = calculateBoundingBox(rects);
  const diff = getRectDiff(centroid, centerRect);

  return rects.map(rect => applyRectDiff(rect, diff));
}

export function layoutItemsInTreeFormation(items: DragItem[], layout?: LayoutConfigType): DragItem[] {
  const { boundingRect, containerRect } = layout || {};

  const mapping = indexBy(items, i => i.id);
  const rectItems = items.map(item => ({
    ...layout?.itemRect,
    ...item.rect,
    id: item.id,
    upstreamRects: item?.block?.upstream_blocks.map((id: string) => mapping[id]?.rect || {
      ...layout?.itemRect,
      id,
    }) ?? [],
  }));

  let rects = layoutRectsInTreeFormation(rectItems, layout);

  if (containerRect && boundingRect) {
    rects = centerRects(rects, boundingRect, containerRect);
  }

  return rects.map(rect => ({ ...mapping[rect.id], rect }));
}

function layoutRectsInTreeFormation(items: RectType[], layout?: LayoutConfigType): RectType[] {
  const {
    direction,
    gap,
  } = { ...DEFAULT_LAYOUT_CONFIG, ...layout };
  const { column: horizontalSpacing, row: verticalSpacing } = gap;

  const positionedItems: RectType[] = [];
  const levels: Map<RectType, number> = new Map();
  const maxLevelWidths: Map<number, number> = new Map();
  const maxLevelHeights: Map<number, number> = new Map();
  const childrenMapping: Map<RectType, RectType[]> = new Map();
  const visited = new Set<RectType>();

  // Determine the levels for each item
  function determineLevel(item: RectType): number {
    if (levels.has(item)) {
      return levels.get(item)!;
    }
    if (visited.has(item)) {
      throw new Error(`Cycle detected involving item id ${item.id}`);
    }
    visited.add(item);

    if (item.upstreamRects.length === 0) {
      levels.set(item, 0);
    } else {
      levels.set(item, Math.max(...item.upstreamRects.map(rect => {
        const parentItem = items.find(i => i.id === rect.id
          || (i.left === rect.left && i.top === rect.top && i.width === rect.width && i.height === rect.height));
        if (parentItem) {
          const parentLevel = determineLevel(parentItem);
          const children = childrenMapping.get(parentItem) || [];
          children.push(item);
          childrenMapping.set(parentItem, children);
          return parentLevel + 1;
        }
        return 0;
      })));
    }
    visited.delete(item);
    return levels.get(item)!;
  }

  items.forEach(determineLevel);

  // Collect items by level
  const levelItems: Map<number, RectType[]> = new Map();
  items.forEach(item => {
    const level = levels.get(item)!;
    if (!levelItems.has(level)) {
      levelItems.set(level, []);
    }
    levelItems.get(level)!.push(item);

    if (!maxLevelWidths.has(level)) {
      maxLevelWidths.set(level, 0);
      maxLevelHeights.set(level, 0);
    }

    // Track maximum dimensions at each level for centers calculation
    maxLevelWidths.set(level, Math.max(maxLevelWidths.get(level)!, item.width));
    maxLevelHeights.set(level, Math.max(maxLevelHeights.get(level)!, item.height));
  });

  // Position items level by level
  levelItems.forEach((rects, level) => {
    let offset = 0;

    // Calculate total dimension for alignment within current level
    const totalDimension = rects.reduce(
      (sum, rect) => sum
      + (direction === LayoutConfigDirectionEnum.HORIZONTAL ? rect.height : rect.width)
      + (direction === LayoutConfigDirectionEnum.HORIZONTAL ? verticalSpacing : horizontalSpacing), 0)
    - (direction === LayoutConfigDirectionEnum.HORIZONTAL ? verticalSpacing : horizontalSpacing);
    const maxDimension = direction === LayoutConfigDirectionEnum.HORIZONTAL
      ? maxLevelHeights.get(level)!
      : maxLevelWidths.get(level)!;

    rects.forEach(item => {
      if (direction === LayoutConfigDirectionEnum.HORIZONTAL) {
        item.left = level * (maxLevelWidths.get(level)! + horizontalSpacing);
        item.top = offset + (maxDimension - totalDimension) / 2;
        offset += item.height + verticalSpacing;
      } else {
        item.top = level * (maxLevelHeights.get(level)! + verticalSpacing);
        item.left = offset + (maxDimension - totalDimension) / 2;
        offset += item.width + horizontalSpacing;
      }

      positionedItems.push(item);
    });
  });

  // Center the entire layout within its container
  const finalBoundingBox = calculateBoundingBox(positionedItems);
  const offsetX = finalBoundingBox.left - (finalBoundingBox.width / 2);
  const offsetY = finalBoundingBox.top - (finalBoundingBox.height / 2);

  return positionedItems.map(item => ({
    ...item,
    left: item.left - offsetX,
    top: item.top - offsetY,
  }));
}

function getRectDiff(rect1: RectType, rect2: RectType): RectType {
  const dx = rect2.left - rect1.left;
  const dy = rect2.top - rect1.top;
  return { left: dx, top: dy };
}

function applyRectDiff(rect: RectType, diff: RectType): RectType {
  return {
    ...rect,
    left: rect.left + diff.left,
    top: rect.top + diff.top,
  };
}

type ItemGroup = {
  items: DragItem[];
  upstreamGroups: string[];
};

export function layoutItemsInGroups(
  groups: Record<string, ItemGroup>,
  layout: LayoutConfigType,
): Record<string, DragItem[]> {
  const {
    boundingRect,
    containerRect,
  } = layout;

  const groupsMapping = {};

  Object.entries(groups || {})?.forEach(([groupID, { items }]: [string, ItemGroup]) => {
    const itemsByID = indexBy(items || [], (item: DragItem) => item?.block?.uuid);
    const items2 = items?.map((item: DragItem) => ({
      ...item,
      rect: {
        ...item?.rect,
        upstreamRects: uniqueArray(item?.block?.upstream_blocks ?? [])?.reduce(
          (acc: RectType[], buuid: string) => {
            const rect = itemsByID[buuid]?.rect;
            return rect ? acc.concat({ ...rect, id: buuid }) : acc;
          },
          [],
        ),
      },
    }))  as DragItem[];

    const rects = layoutRectsInTreeFormation(items2.map((item: DragItem) => item.rect), layout);
    const items3 = items2?.map((item: DragItem, idx: number) => ({
      ...item,
      rect: rects[idx],
    }));
    const box = calculateBoundingBox(rects);

    groupsMapping[groupID] = {
      items: items3,
      rect: box,
      uuid: groupID,
    };
  });

  Object.values(groupsMapping || {}).forEach(({ rect, items, uuid }) => {
    const itemGroup = groups[uuid];

    groupsMapping[uuid] = {
      items,
      rect: {
        ...rect,
        upstreamRects: uniqueArray(itemGroup.upstreamGroups ?? []).reduce(
          (acc: RectType[], id: string) => {
            const rect = groupsMapping[id]?.rect;
            return rect ? acc.concat({ ...rect, id }) : acc;
          }, []),
      },
      uuid,
    };
  });

  const rectsTree0 = Object.entries(
    groupsMapping || {},
  )?.map(([id, item]: [string, { rect: RectType }]) => ({ ...item.rect, id }));
  console.log('rectsTree0', rectsTree0);
  const rectsTree1 = layoutRectsInTreeFormation(rectsTree0, layout);
  console.log('rectsTree1', rectsTree1);
  const rectsTree2 = centerRects(rectsTree1, boundingRect, containerRect);
  console.log('rectsTree2', rectsTree2);

  return rectsTree2.reduce((acc, groupRect: RectType) => {
    const {
      items,
    } = groupsMapping[groupRect.id];
    const rectItems = items?.map((item: DragItem) => item?.rect);

    const itemsBox = calculateBoundingBox(rectItems);
    const centerRect = calculateCentroid([groupRect]);
    const diff = getRectDiff(itemsBox, centerRect);

    const itemsCentered = items?.map((item: DragItem) => ({
      ...item,
      rect: applyRectDiff(item?.rect, diff),
    }));
    console.log('itemsCentered', itemsCentered);

    return {
      ...acc,
      [groupRect.id]: itemsCentered,
    };
  }, {});
}

function updateItemRect(item: DragItem, rect: RectType) {
  return update(item, {
    rect: {
      $merge: rect,
    },
  });
}

function layoutItemsInSqaure(
  items: DragItem[],
  layout?: LayoutConfigType,
) {
  const rects = items.map(item => item.rect);
  const repositionedRects = repositionInGroup(rects, layout);

  return items.map((item, index) => {
    const { left, top } = repositionedRects[index];

    return updateItemRect(item, { ...item?.rect, left, top });
  });
}

function repositionInGroup(
  rects: RectType[],
  layout?: LayoutConfigType,
): RectType[] {
  const { gap, grid } = layout || {};
  let {
    columns: numCols,
    rows: numRows,
  } = grid || {};
  const {
    column: horizontalSpacing = 50,
    row: verticalSpacing = 50,
  } = gap || {};

  // If there is only one rect, return it as is
  if (rects.length === 1) {
    return rects;
  }

  if (!numRows && !numCols) {
    numCols = Math.floor(Math.sqrt(rects.length));
    numRows = Math.ceil(rects.length / numCols);  // If numRows is not provided, calculate it based on numCols
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
    numRows = Math.ceil(rects.length / numCols);  // If numRows is not provided, calculate it based on numCols
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
  const total = rects.reduce(
    (acc, rect) => ({
      left: acc.left + rect.left + rect.width / 2,
      top: acc.top + rect.top + rect.height / 2,
    }),
    { left: 0, top: 0 },
  );

  return {
    left: total.left / rects.length,
    top: total.top / rects.length,
  };
}

function calculateBoundingBox(rects: RectType[]): RectType {
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
    left: minLeft,
    top: minTop,
    width: width,
    height: height,
  };
}

function layoutRectsInWavePattern(
  rects: RectType[],
  opts?: {
    amplitude?: number;
    wavelength?: number;
    spacing?: number;
    direction?: LayoutConfigDirectionEnum;
  },
): RectType[] {
  const {
    amplitude = 40,
    wavelength = 100,
    spacing = 20,
    direction = LayoutConfigDirectionEnum.HORIZONTAL,
  } = opts || {};

  let accumulatedWidth = 0;
  let accumulatedHeight = 0;

  return rects.map((rect, index) => {
    let updatedRect: RectType;

    if (direction === LayoutConfigDirectionEnum.HORIZONTAL) {
      // Calculate wave positioning for horizontal direction
      const xPos = accumulatedWidth;
      const yPos = amplitude * Math.sin((2 * Math.PI / wavelength) * xPos);
      accumulatedWidth += rect.width + spacing;

      updatedRect = {
        ...rect,
        left: xPos,
        top: yPos,
      };
    } else {
      // Calculate wave positioning for vertical direction
      const yPos = accumulatedHeight;
      const xPos = amplitude * Math.sin((2 * Math.PI / wavelength) * yPos);
      accumulatedHeight += rect.height + spacing;

      updatedRect = {
        ...rect,
        left: xPos,
        top: yPos,
      };
    }

    return updatedRect;
  });
}
