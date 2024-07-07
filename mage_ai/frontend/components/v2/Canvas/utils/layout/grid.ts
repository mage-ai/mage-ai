import { LayoutConfigType, RectType } from '../../interfaces';
import { DEFAULT_LAYOUT_CONFIG, calculateBoundingBox } from './shared';


function pattern1(
  rects: RectType[],
  layout?: LayoutConfigType,
  opts?: {
    align?: {
      horizontal?: 'left' | 'center' | 'right';
      vertical?: 'top' | 'center' | 'bottom';
    };
  }
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

  const determinedLevels: Map<number | string, number> = new Map();
  const visited = new Set<number | string>();

  // Determine the levels for each item
  function determineLevel(item: RectType): number {
    if (determinedLevels.has(item.id)) {
      return determinedLevels.get(item.id);
    }
    if (visited.has(item.id)) {
      throw new Error(`Cycle detected involving item id ${item.id}`);
    }
    visited.add(item.id);

    if (item.upstream.length === 0) {
      determinedLevels.set(item.id, 0);
    } else {
      const level = Math.max(
        ...item.upstream.map((rect) => {
          const parentItem = rects.find((i) => i.id === rect.id);
          if (parentItem) {
            return determineLevel(parentItem) + 1;
          }
          return 0;
        })
      );
      determinedLevels.set(item.id, level);
    }
    visited.delete(item.id);
    return determinedLevels.get(item.id);
  }

  rects.forEach(determineLevel);

  // Sort rectangles by determined levels
  const sortedRects = rects.slice().sort((a, b) => determinedLevels.get(a.id) - determinedLevels.get(b.id));

  const positionedRects: RectType[] = [];
  let currentX = 0;
  let currentY = 0;
  let maxHeightInRow = 0;
  let colIdx = 0;

  sortedRects.forEach((rect, index) => {
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
    positionedRects.push(updatedRect);
  });

  // Compute bounding box for alignment adjustments
  const finalBoundingBox = calculateBoundingBox(positionedRects);
  const offsetX = opts?.align?.horizontal ? finalBoundingBox.left - finalBoundingBox.width / 2 : 0;
  const offsetY = opts?.align?.vertical ? finalBoundingBox.top - finalBoundingBox.height / 2 : 0;

  return positionedRects.map((rect: RectType) => ({
    ...rect,
    left: rect.left - offsetX,
    top: rect.top - offsetY,
  }));
}

export default {
  pattern1,
}
