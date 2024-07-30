import { RectType } from "@mana/shared/interfaces";

interface Rect extends RectType {
  left: number;
  top: number;
  width: number;
  height: number;
  type?: string;
}

export function doesRectIntersect(rect1: RectType, rect2: RectType): boolean {
  return !(
    rect1.left >= rect2.left + rect2.width ||
    rect1.left + rect1.width <= rect2.left ||
    rect1.top >= rect2.top + rect2.height ||
    rect1.top + rect1.height <= rect2.top
  );
}

export function doesPointIntersectRect(point: { x: number; y: number }, rect: Rect): boolean {
  return (
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
}


export function findLargestUnoccupiedSpace(mainRect: Rect, rects: Rect[], boundingBox: Rect): Rect {
  const { left: mainLeft, top: mainTop, width: mainWidth, height: mainHeight } = mainRect;
  const mainRight = mainLeft + mainWidth;
  const mainBottom = mainTop + mainHeight;

  let largestSpace: Rect = { left: 0, top: 0, width: 0, height: 0 };
  let minDistance = Infinity;

  // Check space above main rect
  const topSpace: Rect = {
    left: mainLeft,
    top: boundingBox.top,
    width: mainWidth,
    height: mainTop - boundingBox.top,
  };
  if (isUnoccupied(topSpace, rects) && topSpace.height > largestSpace.height) {
    largestSpace = topSpace;
    minDistance = 0;
  }

  // Check space below main rect
  const bottomSpace: Rect = {
    left: mainLeft,
    top: mainBottom,
    width: mainWidth,
    height: boundingBox.top + boundingBox.height - mainBottom,
  };
  if (
    isUnoccupied(bottomSpace, rects) &&
    bottomSpace.height > largestSpace.height &&
    bottomSpace.top - mainBottom < minDistance
  ) {
    largestSpace = bottomSpace;
    minDistance = bottomSpace.top - mainBottom;
  }

  // Check space to the left of main rect
  const leftSpace: Rect = {
    left: boundingBox.left,
    top: mainTop,
    width: mainLeft - boundingBox.left,
    height: mainHeight,
  };
  if (
    isUnoccupied(leftSpace, rects) &&
    leftSpace.width > largestSpace.width &&
    mainLeft - leftSpace.left < minDistance
  ) {
    largestSpace = leftSpace;
    minDistance = mainLeft - leftSpace.left;
  }

  // Check space to the right of main rect
  const rightSpace: Rect = {
    left: mainRight,
    top: mainTop,
    width: boundingBox.left + boundingBox.width - mainRight,
    height: mainHeight,
  };
  if (
    isUnoccupied(rightSpace, rects) &&
    rightSpace.width > largestSpace.width &&
    rightSpace.left - mainRight < minDistance
  ) {
    largestSpace = rightSpace;
  }

  return largestSpace;
}

function isUnoccupied(space: Rect, rects: Rect[]): boolean {
  for (const rect of rects) {
    if (
      space.left < rect.left + rect.width &&
      space.left + space.width > rect.left &&
      space.top < rect.top + rect.height &&
      space.top + space.height > rect.top
    ) {
      return false;
    }
  }
  return true;
}
