import update from 'immutability-helper';

import BlockType from '@interfaces/BlockType';
import { DragItem, LayoutConfigType, RectType } from '../interfaces';
import {
  LayoutConfigDirectionEnum,
  LayoutConfigDirectionOriginEnum,
} from '../types';
import { indexBy } from '@utils/array';

type GroupType = { items: DragItem[], position: { left: number; top: number } };

const DEFAULT_LAYOUT_CONFIG: LayoutConfigType = {
  direction: LayoutConfigDirectionEnum.HORIZONTAL,
  gap: {
    column: 40,
    row:40,
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
  containerRect?: RectType;
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

export function determinePositions(
  items: DragItem[],
  opts?: SetupOpts,
): Record<string, RectType> {
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
      row:40,
    },
    itemRect = {
      height: 200,
      width: 300,
    },
  } = { ...DEFAULT_LAYOUT_CONFIG, ...layout };

  const positions: Record<string, { left: number; top: number }> = {};
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

    groupedRects.forEach(({ id, left, top, ...rect }) => {
      positions[id] = {
        ...(rect ?? itemRect),
        left: currentGroupOffset.left + left,
        top: currentGroupOffset.top + top,
      };
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

export function layoutItemsInContainer(
  items: DragItem[],
  positions: Record<string, RectType>,
  containerRect: RectType,
): DragItem[] {
  // This function lays out items within a container by centering them.
  const { height, width } = containerRect || { height: 0, width: 0 };
  const minLeft = Math.min(...Object.values(positions).map((p) => p.left));
  const minTop = Math.min(...Object.values(positions).map((p) => p.top));
  const maxLeft = Math.max(...Object.values(positions).map((p) => p.left));
  const maxTop = Math.max(...Object.values(positions).map((p) => p.top));
  const offsetX = (width - (maxLeft - minLeft)) / 2;
  const offsetY = (height - (maxTop - minTop)) / 2;

  return items.map((item: DragItem) => {
    const rect = positions[item.id];

    return {
      ...item,
      rect: {
        ...rect,
        ...item?.rect,
        left: rect.left + offsetX,
        top: rect.top + offsetY,
      },
    };
  });
}

export function layoutItemsInTreeFormation(items: DragItem[], layout?: LayoutConfigType): DragItem[] {
  const mapping = indexBy(items, i => i.id);
  const rectItems = items.map(item => ({
    ...layout?.itemRect,
    ...item.rect,
    id: item.id,
    upstreamRects: item?.block?.upstream_blocks.map((id: string) => mapping[id].rect),
  }));

  const rects = layoutRectsInTreeFormation(rectItems, layout);

  console.log(rects);

  return rects.map(rect => ({ ...mapping[rect.id], rect }));
}

function layoutRectsInTreeFormation(items: RectType[], layout?: LayoutConfigType): RectType[] {
  const {
    direction,
    gap,
  } = { ...DEFAULT_LAYOUT_CONFIG, ...layout};
  const { column: horizontalSpacing, row: verticalSpacing } = gap;

  const positionedItems: RectType[] = [];
  const levels: Map<RectType, number> = new Map();
  const maxLevelWidth: Map<number, number> = new Map();
  const maxLevelHeight: Map<number, number> = new Map();
  const childrenMapping: Map<RectType, RectType[]> = new Map();

  // Determine the levels for each item
  function determineLevel(item: RectType): number {
    if (levels.has(item)) {
      return levels.get(item)!;
    }
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
    return levels.get(item)!;
  }

  items.forEach(determineLevel);

  // Calculate positions based on levels and whether we're fanning in or out
  items.forEach(item => {
    const level = levels.get(item)!;
    const siblings = childrenMapping.get(item) || [];

    if (!maxLevelWidth.has(level)) maxLevelWidth.set(level, 0);
    if (!maxLevelHeight.has(level)) maxLevelHeight.set(level, 0);

    if (direction === LayoutConfigDirectionEnum.HORIZONTAL) {
      item.left = maxLevelWidth.get(level)! + horizontalSpacing;
      item.top = level * (item.height + verticalSpacing);

      if (siblings.length > 0) {
        item.top -= ((siblings.length - 1) * (item.height + verticalSpacing)) / 2;
      }

      maxLevelWidth.set(level, item.left + item.width);
      maxLevelHeight.set(level, Math.max(maxLevelHeight.get(level)!, item.height));
    } else {
      item.top = maxLevelHeight.get(level)! + verticalSpacing;
      item.left = level * (item.width + horizontalSpacing);

      if (siblings.length > 0) {
        item.left -= ((siblings.length - 1) * (item.width + horizontalSpacing)) / 2;
      }

      maxLevelHeight.set(level, item.top + item.height);
      maxLevelWidth.set(level, Math.max(maxLevelWidth.get(level)!, item.width));
    }

    positionedItems.push(item);
  });

  return positionedItems;
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

export function repositionGroups(groups: Record<string, DragItem[]>): Record<string, DragItem[]> {
  const rectsOfGroups: Record<string, DragItem> = {};
  const groupsUpdated = {};

  Object.entries(groups || {})?.forEach(([uuid, items1]: [string, DragItem[]]) => {
    const {
      rects0,
      rects1,
    } = items1.reduce((acc, item: DragItem) => ({
      ...acc,
      rects0: acc.rects0.concat(item?.rect?.diff),
      rects1: acc.rects1.concat(item?.rect),
    }), {
      rects0: [],
      rects1: [],
    });

    const box0 = calculateBoundingBox(rects0);
    console.log('uuid', box0);

    const items2 = repositionItems(items1);
    const rects2 = items2.map((item: DragItem) => item.rect);
    const box1 = calculateBoundingBox(rects2);

    groupsUpdated[uuid] = items2;
    rectsOfGroups[uuid] = {
      id: uuid,
      rect: {
        height: box1.height,
        left: box0.left,
        top: box0.top,
        width: box1.width,
      },
    } as DragItem;
  });

  return (Object.values(rectsOfGroups) as DragItem[]).reduce((acc: Record<string, DragItem[]>, group: DragItem) => {
    const { id, rect } = group as DragItem;
    const items1 = groupsUpdated[id] || [];
    const rects1 = items1.map((item: DragItem) => item.rect);

    const rects2 = shiftRectsIntoBoundingBox(rects1, rect);
    const items2: DragItem[] =
      items1.map((item: DragItem, index: number) => updateItemRect(item, rects2[index]));

    return {
      ...acc,
      [id]: items2,
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

function repositionItems(
  items: DragItem[],
  opts?: {
    horizontalSpacing?: number;
    numCols?: number;
    numRows?: number;
    verticalSpacing?: number;
  },
) {
  const rects = items.map(item => item.rect);
  const repositionedRects = repositionInGroup(rects, opts);

  return items.map((item, index) => {
    const { left, top } = repositionedRects[index];

    return updateItemRect(item, { ...item?.rect, left, top });
  });
}

function repositionInGroup(
  rects: RectType[],
  opts?: {
    horizontalSpacing?: number;
    verticalSpacing?: number;
    numCols?: number;
    numRows?: number;
  },
): RectType[] {
  let {
    numCols,
    numRows,
  } = opts || {};
  const {
    horizontalSpacing = 50,
    verticalSpacing = 50,
  } = opts || {};

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
