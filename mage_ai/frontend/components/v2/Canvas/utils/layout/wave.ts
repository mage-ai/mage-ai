import { LayoutConfigType, RectType } from '../../interfaces';
import { LayoutConfigDirectionEnum } from '../../types';

function pattern2(
  items: RectType[],
  layout?: LayoutConfigType,
  opts?: {
    amplitude?: number;
    wavelength?: number;
  },
): RectType[] {
  const { direction = LayoutConfigDirectionEnum.HORIZONTAL, gap } = layout || {};
  const { amplitude = 20, wavelength = 50 } = opts || {};
  const { column: gapCol = 5, row: gapRow = 5 } = gap || {};

  // Step 1: Determine levels and dependencies
  const levels: Map<number | string, number> = new Map();
  const childrenMapping: Map<RectType, RectType[]> = new Map();
  const visited = new Set<number | string>();

  function determineLevel(item: RectType): number {
    if (levels.has(item.id)) return levels.get(item.id);
    if (visited.has(item.id)) throw new Error(`Cycle detected involving item id ${item.id}`);
    visited.add(item.id);

    if (item.upstream.length === 0) {
      levels.set(item.id, 0);
    } else {
      const lvl = Math.max(
        ...item.upstream.map(rect => {
          const parentItem = items.find(i => i.id === rect.id);
          if (parentItem) {
            const parentLevel = determineLevel(parentItem);
            const children = childrenMapping.get(parentItem) || [];
            children.push(item);
            childrenMapping.set(parentItem, children);
            return parentLevel + 1;
          }
          return 0;
        })
      );
      levels.set(item.id, lvl);
    }
    visited.delete(item.id);
    return levels.get(item.id);
  }

  items.forEach(determineLevel);

  // Step 2: Arrange items based on levels
  const levelItems: Map<number, RectType[]> = new Map();
  items.forEach(item => {
    const level = levels.get(item.id);
    if (!levelItems.has(level)) levelItems.set(level, []);
    levelItems.get(level).push(item);
  });

  // Step 3: Lay out the rects in a wave pattern with minimal spacing
  const positionedItems: RectType[] = [];
  let accumulatedWidth = 0;
  let accumulatedHeight = 0;

  levelItems.forEach((rects: RectType[], level: number) => {
    rects.forEach(rect => {
      let left = 0;
      let top = 0;

      if (direction === LayoutConfigDirectionEnum.HORIZONTAL) {
        left = accumulatedWidth;
        top = amplitude * Math.sin(((2 * Math.PI) / wavelength) * left) + level * (rect.height + gapRow);
        accumulatedWidth += rect.width + gapCol;
      } else {
        top = accumulatedHeight;
        left = amplitude * Math.sin(((2 * Math.PI) / wavelength) * top) + level * (rect.width + gapCol);
        accumulatedHeight += rect.height + gapRow;
      }

      positionedItems.push({ ...rect, left, top });
    });
  });

  return positionedItems;
}

// Original
function pattern1(
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

function pattern3(
  rects: RectType[],
  layout?: LayoutConfigType,
  opts?: {
    amplitude?: number;
    wavelength?: number;
  },
): RectType[] {
  const { amplitude = 40, wavelength = 100 } = opts || {};
  const { direction = LayoutConfigDirectionEnum.HORIZONTAL, gap } = layout || {};

  const levels: Map<number | string, number> = new Map();
  const childMapping: Map<number | string, (number | string)[]> = new Map();

  // Determine the level of each rect based on upstream dependencies
  function determineLevel(rect: RectType, visited: Set<number | string> = new Set()): number {
    if (levels.has(rect.id)) {
      return levels.get(rect.id);
    }
    if (visited.has(rect.id)) {
      throw new Error(`Cycle detected involving rect id ${rect.id}`);
    }
    visited.add(rect.id);

    if (rect.upstream.length === 0) {
      levels.set(rect.id, 0);
    } else {
      const level = 1 + Math.max(
        ...rect.upstream.map(upstreamId => {
          const upstreamRect = rects.find(r => r.id === upstreamId);
          if (upstreamRect) {
            const upstreamLevel = determineLevel(upstreamRect, new Set(visited));
            if (!childMapping.has(upstreamId)) {
              childMapping.set(upstreamId, []);
            }
            childMapping.get(upstreamId).push(rect.id);
            return upstreamLevel;
          }
          return 0;
        }),
      );
      levels.set(rect.id, level);
    }
    visited.delete(rect.id);
    return levels.get(rect.id);
  }

  rects.forEach(rect => determineLevel(rect));

  // Sort rects based on level to ensure upstream rects come before downstream
  const sortedRects = rects.sort((a, b) => levels.get(a.id) - levels.get(b.id));

  let accumulatedPos = 0;
  const wavePositions: Map<number | string, { x: number; y: number }> = new Map();

  // Calculate wave positions for each rect
  sortedRects.forEach(rect => {
    let xPos: number;
    let yPos: number;

    if (direction === LayoutConfigDirectionEnum.HORIZONTAL) {
      xPos = accumulatedPos;
      yPos = amplitude * Math.sin(((2 * Math.PI) / wavelength) * xPos);
      accumulatedPos += rect.width + (gap?.column ?? 0);
    } else {
      yPos = accumulatedPos;
      xPos = amplitude * Math.sin(((2 * Math.PI) / wavelength) * yPos);
      accumulatedPos += rect.height + (gap?.row ?? 0);
    }

    wavePositions.set(rect.id, { x: xPos, y: yPos });
  });

  // Position rects at their wave positions
  const positionedRects = sortedRects.map(rect => ({
    ...rect,
    left: wavePositions.get(rect.id).x,
    top: wavePositions.get(rect.id).y,
  }));

  // Ensure no obstruction between connected upstream and downstream rects
  function isObstructed(upstreamRect: RectType, downstreamRect: RectType): boolean {
    const minLevel = levels.get(upstreamRect.id) + 1;
    const maxLevel = levels.get(downstreamRect.id);

    for (let level = minLevel; level < maxLevel; level++) {
      const rectsAtLevel = sortedRects.filter(r => levels.get(r.id) === level);
      for (const rect of rectsAtLevel) {
        if (direction === LayoutConfigDirectionEnum.HORIZONTAL) {
          if (
            upstreamRect.left < rect.left &&
            rect.left < downstreamRect.left &&
            Math.min(upstreamRect.top, downstreamRect.top) < rect.top &&
            rect.top < Math.max(upstreamRect.top, downstreamRect.top)
          ) {
            return true;
          }
        } else {
          if (
            upstreamRect.top < rect.top &&
            rect.top < downstreamRect.top &&
            Math.min(upstreamRect.left, downstreamRect.left) < rect.left &&
            rect.left < Math.max(upstreamRect.left, downstreamRect.left)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }

  positionedRects.forEach(rect => {
    rect.upstream.forEach(upstreamId => {
      const upstreamRect = positionedRects.find(r => r.id === upstreamId);
      if (upstreamRect && isObstructed(upstreamRect, rect)) {
        throw new Error(`Obstruction detected between rects ${upstreamId} and ${rect.id}`);
      }
    });
  });

  return positionedRects;
}

export default {
  pattern1,
  pattern2,
  pattern3,
}
