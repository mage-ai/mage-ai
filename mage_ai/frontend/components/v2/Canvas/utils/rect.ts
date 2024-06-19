import update from 'immutability-helper';

import BlockType from '@interfaces/BlockType';
import { DragItem, PortType, LayoutConfigType, RectType } from '../interfaces';
import {
  LayoutConfigDirectionEnum,
} from '../types';

export type SetupOpts = {
  blockHeight?: number;
  blockWidth?: number;
  horizontalSpacing?: number;
  groupBy?: (block: BlockType) => string;
  layout?: LayoutConfigType;
  containerRect?: RectType;
  verticalSpacing?: number;
};

export function getTransformedBoundingClientRect(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  let { left: offsetX, top: offsetY } = rect;
  const { width, height } = rect;

  let el = element;
  while (el) {
    const computedStyle = window.getComputedStyle(el);
    const transform = computedStyle.transform;

    if (transform && transform !== 'none') {
      const matrix = new DOMMatrix(transform);

      // We transform the offset position using the matrix
      const transformedPoint = new DOMPoint(offsetX, offsetY).matrixTransform(matrix);
      offsetX = transformedPoint.x;
      offsetY = transformedPoint.y;
    }

    if (!el.offsetParent) break;
    el = el.offsetParent as HTMLElement;
  }

  return {
    x: offsetX,
    y: offsetY,
    width,
    height,
    left: offsetX,
    top: offsetY,
    right: offsetX + width,
    bottom: offsetY + height,
  };
}

export function determinePositions(
  blocks: ({
    id: number | string;
    upstream_blocks: number[] | string[];
    uuid: number | string;
  } | BlockType)[],
  opts?: SetupOpts,
): Record<string, RectType> {
  const {
    blockHeight = 100,
    blockWidth = 100,
    horizontalSpacing = 100,
    layout,
    verticalSpacing = 100,
    groupBy,
  } = opts || {};

  const {
    direction: layoutDirection = LayoutConfigDirectionEnum.HORIZONTAL,
    origin: layoutOrigin = 'left',
  } = layout || {
    direction: LayoutConfigDirectionEnum.HORIZONTAL,
    origin: 'left',
  };

  const positions: Record<string, { left: number; top: number }> = {};
  const levels: Record<string, number> = {};
  let maxLevel = 0;

  function determineLevel(block: BlockType): number {
    if (levels[block.uuid] !== undefined) {
      return levels[block.uuid];
    }
    if (block.upstream_blocks.length === 0) {
      levels[block.uuid] = 0;
    } else {
      levels[block.uuid] = Math.max(
        ...block?.upstream_blocks?.map((upstreamId) => {
          const upstreamBlock = blocks.find((b) => b.uuid === upstreamId);
          return upstreamBlock ? determineLevel(upstreamBlock as BlockType) + 1 : 0;
        }),
      );
    }
    maxLevel = Math.max(maxLevel, levels[block.uuid]);
    return levels[block.uuid];
  }

  blocks.forEach(determineLevel);

  const groups: Record<string, { blocks: BlockType[], position: { left: number; top: number } }> = {};

  if (groupBy) {
    blocks.forEach((block) => {
      const groupKey = groupBy(block as BlockType);
      if (!groups[groupKey]) {
        groups[groupKey] = { blocks: [], position: null };
      }
      groups[groupKey].blocks.push(block as BlockType);
    });
  } else {
    groups['default'] = { blocks: blocks as any, position: { left: 0, top: 0 } };
  }

  const currentGroupOffset = { left: 0, top: 0 };
  const padding = 20; // Additional padding for groups

  Object.entries(groups).forEach(([groupKey, group], groupIndex) => {
    const groupBlocks = group.blocks.map(block => ({
      ...((block as { rect: RectType })?.rect ?? {
        height: blockHeight,
        width: blockWidth,
      }),
      id: block.uuid ?? (block as { id: number })?.id,
      left: 0,
      top: 0,
    }));

    const groupedRects = groupRectangles(groupBlocks as RectType[], Math.max(horizontalSpacing, verticalSpacing));

    groupedRects.forEach(({ id, left, top }) => {
      positions[id] = {
        left: currentGroupOffset.left + left,
        top: currentGroupOffset.top + top,
      };
    });

    const groupWidth = Math.max(...groupedRects.map(rect => rect.left + rect.width));
    const groupHeight = Math.max(...groupedRects.map(rect => rect.top + rect.height));

    // Update the offset for the next group
    if (layoutDirection === LayoutConfigDirectionEnum.HORIZONTAL) {
      currentGroupOffset.left += groupWidth + Math.max(horizontalSpacing, verticalSpacing) + padding;
      currentGroupOffset.top = 0; // Reset top position for horizontal row layout
    } else {
      currentGroupOffset.top += groupHeight + Math.max(horizontalSpacing, verticalSpacing) + padding;
      currentGroupOffset.left = 0; // Reset left position for vertical column layout
    }
  });

  return positions;
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

function shiftRectsIntoBoundingBox(rects: RectType[], boundingBox: RectType): RectType[] {
    const groupBoundingBox = calculateBoundingBox(rects);

    const offsetX = boundingBox.left - groupBoundingBox.left;
    const offsetY = boundingBox.top - groupBoundingBox.top;

    return rects.map(rect => ({
        ...rect,
        left: rect.left + offsetX,
        top: rect.top + offsetY,
    }));
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
