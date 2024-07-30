import {
  DEFAULT_LAYOUT_CONFIG,
  applyRectDiff,
  calculateBoundingBox,
  getRectDiff,
  isDebug,
} from './shared';
import { LayoutConfigType } from '../../interfaces';
import { LayoutConfigDirectionEnum } from '../../types';
import { RectType } from '@mana/shared/interfaces';
import { range, flattenArray } from '@utils/array';

function pattern1(
  rects: RectType[],
  layout?: LayoutConfigType,
  opts?: {
    patterns?: {
      level?: (rects: RectType[]) => RectType[];
      levels?: Record<string, (rects: RectType[]) => RectType[]>;
    };
  },
): RectType[] {
  const { gap, grid } = { ...DEFAULT_LAYOUT_CONFIG, ...layout };
  const { column: horizontalSpacing = 10, row: verticalSpacing = 10 } = gap;
  let numCols: number = grid?.columns ?? null;
  let numRows: number = grid?.rows ?? null;

  if (!numRows && !numCols) {
    numRows = Math.ceil(Math.sqrt(rects.length)); // If neither numRows nor numCols are provided, calculate them based on the number of rects
    numCols = Math.ceil(rects.length / numRows);
  }
  if (!numRows) {
    numRows = Math.ceil(rects.length / numCols); // If numRows is not provided, calculate it based on numCols
  }
  if (!numCols) {
    numCols = Math.ceil(rects.length / numRows); // If numCols is not provided, calculate it based on numRows
  }

  const levels: Map<number | string, number> = new Map();
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
        ...item.upstream.map((rect: RectType) => {
          const parentItem = rects.find(i => i.id === rect.id);
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

  rects.forEach(determineLevel);

  const positionedRects: RectType[] = [];
  const positionedMap: Map<number | string, RectType> = new Map();

  let currentX = 0;
  let currentY = 0;
  let maxHeightInRow = 0;
  let colIdx = 0;

  function positionInGrid(rect: RectType, startX: number, startY: number) {
    if (colIdx >= numCols) {
      currentX = 0;
      currentY += maxHeightInRow + verticalSpacing;
      maxHeightInRow = 0;
      colIdx = 0;
    }

    if (positionedMap.has(rect.id)) {
      return;
    }

    rect.left = currentX;
    rect.top = currentY;

    positionedRects.push(rect);
    positionedMap.set(rect.id, rect);

    currentX += rect.width + horizontalSpacing;
    maxHeightInRow = Math.max(maxHeightInRow, rect.height);
    colIdx++;
  }

  function placeRectangle(rect: RectType) {
    positionInGrid(rect, currentX, currentY);
    const children = childrenMapping.get(rect) || [];
    children.forEach(child => placeRectangle(child));
  }

  // Ensure parent-child relationship is maintained
  rects.forEach(rect => {
    if (!positionedMap.has(rect.id)) {
      placeRectangle(rect);
    }
  });

  // Move everything to origin
  let offsetX = 0;
  let offsetY = 0;

  const minX = positionedRects.reduce((min, rect) => Math.min(min, rect.left), Infinity);
  const minY = positionedRects.reduce((min, rect) => Math.min(min, rect.top), Infinity);
  offsetX -= minX;
  offsetY -= minY;

  return positionedRects.map((rect: RectType) => ({
    ...rect,
    left: rect.left + offsetX,
    top: rect.top + offsetY,
  }));
}

export default {
  pattern1,
};
