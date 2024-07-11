import { DEFAULT_LAYOUT_CONFIG, applyRectDiff, calculateBoundingBox, getRectDiff, isDebug } from './shared';
import { LayoutConfigType } from '../../interfaces';
import { LayoutConfigDirectionEnum } from '../../types';
import { RectType } from '@mana/shared/interfaces';
import { range, flattenArray } from '@utils/array';

function pattern1(
  items: RectType[],
  layout?: LayoutConfigType,
  opts?: {
    patterns?: {
      level?: (rects: RectType[]) => RectType[];
      levels?: Record<string, (rects: RectType[]) => RectType[]>;
    };
  },
): RectType[] {
  const { direction, gap, options } = { ...DEFAULT_LAYOUT_CONFIG, ...layout };
  // const { horizontalAlignment, verticalAlignment } = options ?? {};
  const { column: gapCol, row: gapRow } = gap;
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
    const mod = level % 3;
    const factor = mod === 0 ? 0 : mod === 1 ? 1 : -1;
    const offset = stagger * factor;

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

        isDebug() && console.log(`[${direction}] Top for ${item.id}:`, top, stagger, offset);
        item.top = top + offset;
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

        isDebug() && console.log(`Left for ${item.id}:`, left, stagger, offset);
        item.left = left + offset;
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
    let rects3 = [];

    const { level: patternAll, levels: patternPer } = opts?.patterns ?? {};
    if (patternAll || patternPer) {
      const pattern = patternPer
        ? (patternPer?.[level] ?? patternPer?.[String(level)]) ?? patternAll
        : patternAll;
      rects3 = pattern(rects);
    } else {
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

      rects3 = rects2.map(rect => ({
        ...rect,
        left: isHorizontal ? rect.left + (maxDim2.width - rect.width) / 2 : rect.left,
        top: isHorizontal ? rect.top : rect.top + (maxDim2.height - rect.height) / 2,
      }));
    }

    positionedItems[levelKey] = rects3;
  });

  // Center the entire layout within its container
  const rects = flattenArray(Object.values(positionedItems));
  const finalBoundingBox = calculateBoundingBox(rects);
  isDebug() && console.log('levelItems', levelItems, 'box', finalBoundingBox);

  // Move everything to origin
  let offsetX = 0;
  let offsetY = 0;

  const minX = rects.reduce((min, rect) => Math.min(min, rect.left), Infinity);
  const minY = rects.reduce((min, rect) => Math.min(min, rect.top), Infinity);
  offsetX -= minX;
  offsetY -= minY;

  // if (horizontalAlignment ?? false) {
  //   if (LayoutHorizontalAlignmentEnum.CENTER === horizontalAlignment) {
  //     offsetX += finalBoundingBox.left + finalBoundingBox.width / 2;
  //   } else if (LayoutHorizontalAlignmentEnum.RIGHT === horizontalAlignment) {
  //     offsetX += finalBoundingBox.left + finalBoundingBox.width;
  //   } else if (LayoutHorizontalAlignmentEnum.LEFT === horizontalAlignment) {
  //     offsetX += finalBoundingBox.left;
  //   }
  // }
  // if (verticalAlignment ?? false) {
  //   if (LayoutVerticalAlignmentEnum.CENTER === verticalAlignment) {
  //     offsetY += finalBoundingBox.top + finalBoundingBox.height / 2;
  //   } else if (LayoutVerticalAlignmentEnum.BOTTOM === verticalAlignment) {
  //     offsetY += finalBoundingBox.top + finalBoundingBox.height;
  //   } else if (LayoutVerticalAlignmentEnum.TOP === verticalAlignment) {
  //     offsetY += finalBoundingBox.top;
  //   }
  // }

  return rects.map((rect: RectType) => ({
    ...rect,
    left: rect.left + offsetX,
    top: rect.top + offsetY,
  }));
}

export default {
  pattern1,
};
