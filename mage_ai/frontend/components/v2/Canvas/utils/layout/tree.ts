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
import { range, flattenArray, indexBy } from '@utils/array';
import { objectSize } from '@utils/hash';

function pattern1(
  items: RectType[],
  layout?: LayoutConfigType,
  opts?: {
    rectTransformations?: {
      level?: (rects: RectType[]) => RectType[];
      levels?: Record<string, (rects: RectType[]) => RectType[]>;
    };
  },
): RectType[] {
  const { direction, gap, grid, options } = { ...DEFAULT_LAYOUT_CONFIG, ...layout };
  const { column: gapCol, row: gapRow } = gap;
  const maxItemsPerLevel = grid?.columns ?? 99999;

  const stagger = options?.stagger ?? 0;

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
        ...item.upstream.map((rect: RectType) => {
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

  isDebug() && console.log(levels)

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

  isDebug() && console.log(levelItems)
  isDebug() && console.log(maxLevelWidths, maxLevelHeights)

  const isHorizontal = direction === LayoutConfigDirectionEnum.HORIZONTAL;
  const dimensionsByLevel = [];

  const rectIDsByRelativeLevel = {};
  const rectIDsByActualLevel = {};

  // Position items level by level
  let currentRow = 0;
  levelItems.forEach((rects: RectType[], level: number) => {
    const maxItemsInThisLevel = Math.min(rects.length, maxItemsPerLevel);
    isDebug() && console.log('maxItemsInThisLevel', level, maxItemsInThisLevel)
    const levelKey = String(level);
    const mod = level % 3;
    const factor = mod === 0 ? 0 : mod === 1 ? 1 : -1;
    const offset = stagger * factor;

    rects.forEach((item, idx: number) => {
      const relativeLevel = Math.floor(idx / maxItemsPerLevel);
      const row = currentRow + relativeLevel;
      const positionInRow = idx % maxItemsPerLevel;

      rectIDsByRelativeLevel[String(relativeLevel)] ||= [];
      rectIDsByRelativeLevel[String(relativeLevel)].push(item.id);
      rectIDsByActualLevel[item.id] = levelKey;

      let left = 0;
      let top = 0;

      if (isHorizontal) {
        range(level).forEach((_l, lvl: number) => {
          const increment = maxLevelWidths.get(lvl) + gapCol;
          isDebug() && console.log(`[${direction}] Adding left for ${item.id}:`, increment);
          left += increment;
        });
        isDebug() && console.log(`[${direction}] Left final for ${item.id}:`, left);
        item.left = left + positionInRow * (maxLevelWidths.get(level) + gapCol);

        top = row * (maxLevelHeights.get(level) + gapRow);

        // Zig-zag middle, right, left
        isDebug() && console.log(`[${direction}] Top for ${item.id}:`, top, stagger, offset);
        item.top = top + offset;
      } else {
        range(level).forEach((_l, lvl: number) => {
          const increment = maxLevelHeights.get(lvl) + gapRow;
          isDebug() && console.log(`[${direction}] Adding top for ${item.id}:`, increment);
          top += increment;
        });
        isDebug() && console.log(`[${direction}] Top final for ${item.id}:`, top);
        item.top = top + positionInRow * (maxLevelHeights.get(level) + gapRow);

        left = row * (maxLevelWidths.get(level) + gapCol);

        // Zig-zag center, down, up
        isDebug() && console.log(`Left for ${item.id}:`, left, stagger, offset);
        item.left = left + offset;
      }

      if (!positionedItems[levelKey]) {
        positionedItems[levelKey] = [];
      }
      positionedItems[levelKey].push(item);
    });

    // Calculate total dimension for alignment within current level
    const rects2 = positionedItems[levelKey];
    dimensionsByLevel[levelKey] = calculateBoundingBox(rects2);
    currentRow += maxItemsInThisLevel;
  });

  const maxHeight = Object.values(dimensionsByLevel).reduce(
    (max, rect) => Math.max(max, rect.height),
    0,
  );
  const maxWidth = Object.values(dimensionsByLevel).reduce(
    (max, rect) => Math.max(max, rect.width),
    0,
  );

  isDebug() && console.log(
    'positionedItems', positionedItems,
    'maxWidth', maxWidth,
    'maxHeight', maxHeight,
  )

  const rects1 = flattenArray(Object.values(positionedItems));
  const levelItems2: Map<number, RectType[]> = new Map();
  const levelItems3: Map<number, RectType[]> = new Map();

  let transformedNestedRects = false;
  const { level: patternAll, levels: patternPer } = opts?.rectTransformations ?? {};
  const boundingBoxByLevel = [];
  Object.entries(rectIDsByRelativeLevel ?? {}).forEach(([relativeLevel, ids], idx: number) => {
    const map = indexBy(ids, id => id);

    let rectsinner2 = rects1.filter(r => map?.[r.id]);

    if (patternAll || patternPer) {
      const pattern = patternPer
        ? patternPer?.[relativeLevel] ?? patternPer?.[String(relativeLevel)] ?? patternAll
        : patternAll;

      rectsinner2 = pattern(rectsinner2);
      transformedNestedRects = true;
    }

    if (idx > 0) {
      // Their left, right, top, and bottoms are 0.
      const box1 = boundingBoxByLevel[idx - 1];
      const hacc = box1.height + box1.top;
      const wacc = box1.width + box1.left;
      const padding = isHorizontal ? gapCol : gapRow;

      rectsinner2.forEach(item => {
        item[isHorizontal ? 'left' : 'top'] += (isHorizontal ? wacc : hacc) + padding;
      });
    }

    const box3 = calculateBoundingBox(rectsinner2);
    boundingBoxByLevel.push(box3);

    levelItems3.set(Number(relativeLevel), rectsinner2);

    rectsinner2.forEach(item => {
      const actualLevel = Number(rectIDsByActualLevel[item.id]);

      if (!levelItems2.has(actualLevel)) {
        levelItems2.set(actualLevel, []);
      }
      levelItems2.get(actualLevel).push(item);
    });
  });

  const dimensionsByLevel2 = {};
  boundingBoxByLevel.forEach((box, idx) => {
    dimensionsByLevel2[String(idx)] = box;
  });

  // Vertical:
  // - Align row horizontally
  // - Align row items vertically
  // Horizontal:
  // - Align column vertically
  // - Align column items horizontally

  (transformedNestedRects ? levelItems3 : levelItems2).forEach(
    (rects: RectType[], level: number) => {
      const levelKey = String(level);

      let rects3 = [];

      const bboxForCurrentLevel =
        (transformedNestedRects ? dimensionsByLevel2 : dimensionsByLevel)[levelKey];

      const rectMaxForCurrentLevel = {
        height: Math.max(...rects.map(r => r.height)),
        width: Math.max(...rects.map(r => r.width)),
      };

      const rectMaxAllLevels = {
        height: maxHeight,
        width: maxWidth
      };

      // Layout direction: Horizontal (items in the same level (row) are side by side horizontally)
      //   Vertical align items in the same row.
      //   Horizontal align the entire row within the bounding box of the max width across all rows.
      // Layout direction: Vertical (items in the same level (column) are stacked vertically)
      //   Horizontal align items in the same column.
      //   Vertical align the entire column within the bounding box of the max height across all columns.

      // Align items within the same level
      const rects2 = rects.map((rect, itemIndex: number) => {
        const { width, height } = rect;
        const rectPrev = itemIndex > 0 ? rects[itemIndex - 1] : null;
        const rectF = {
          ...rect,
          left: isHorizontal
            ? itemIndex > 0 ? rectPrev.left + rectPrev.width : rect.left
            : bboxForCurrentLevel.left + ((rectMaxForCurrentLevel.width - width) / 2),
          top: isHorizontal
            ? bboxForCurrentLevel.top + ((rectMaxForCurrentLevel.height - height) / 2)
            : itemIndex > 0 ? rectPrev.top + rectPrev.height : rect.top,
        };

        if (itemIndex > 0) {
          if (isHorizontal) {
            rectF.left = rectF.left + gapCol;
          } else {
            rectF.top = rectF.top + gapRow;
          }
        }

        return rectF;
      });

      // Align the entire level within the bounding box of the max width across all levels
      const bboxForPreviousLevel = level > 0
        ? calculateBoundingBox(positionedItems[String(level - 1)])
        : {};
      rects3 = rects2.map(rect => {
        const { width, height } = rect;
        const rectF = {
          ...rect,
          left: isHorizontal
            ? (rect.left - bboxForCurrentLevel.left) + ((rectMaxAllLevels.width - bboxForCurrentLevel.width) / 2)
            : level > 0 ? (bboxForPreviousLevel.left + bboxForPreviousLevel.width) : rect.left,
          top: isHorizontal
            ? level > 0 ? (bboxForPreviousLevel.top + bboxForPreviousLevel.height) : rect.top
            : (rect.top - bboxForCurrentLevel.top) + ((rectMaxAllLevels.height - bboxForCurrentLevel.height) / 2),
        };

        if (level > 0) {
          if (isHorizontal) {
            rectF.top += gapRow;
          } else {
            rectF.left += gapCol;
          }
        }

        return rectF;
      });

      isDebug() &&
        console.log(
          `[${direction}:${level}]`,
          'bboxForCurrentLevel', bboxForCurrentLevel,
          'bboxForPreviousLevel', bboxForPreviousLevel,
          'rectMaxForCurrentLevel', rectMaxForCurrentLevel,
          'rectMaxAllLevels', rectMaxAllLevels,
          'rects2', rects2,
          'rects3', rects3,
          'gapCol', gapCol,
          'gapRow', gapRow,
        );

      positionedItems[levelKey] = rects3;
    },
  );

  // Center the entire layout within its container
  const rects4 = flattenArray(Object.values(positionedItems));
  const finalBoundingBox = calculateBoundingBox(rects4);
  isDebug() && console.log('levelItems2', levelItems2, 'box', finalBoundingBox);

  // Move everything to origin
  let offsetX = 0;
  let offsetY = 0;

  const minX = rects4.reduce((min, rect) => Math.min(min, rect.left), Infinity);
  const minY = rects4.reduce((min, rect) => Math.min(min, rect.top), Infinity);
  offsetX -= minX;
  offsetY -= minY;

  return rects4.map((rect: RectType) => ({
    ...rect,
    left: rect.left + offsetX,
    top: rect.top + offsetY,
  }));
}

export default {
  pattern1,
};
