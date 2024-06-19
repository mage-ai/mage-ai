import { RectType } from '../interfaces';

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

export function groupRectangles(rectangles: RectType[]): RectType[] {
  // Sort rectangles by y position first, then x position for better alignment
  const sortedRects = rectangles.sort((a, b) => (a.top - b.top) || (a.left - b.left));

  let currentX = 0;
  let currentY = 0;
  let maxHeight = 0;
  const margin = 10; // Margin between rectangles

  return sortedRects.map((rect, index) => {
    if (index > 0) {
      // Move to the right of the previous rectangle, adding a margin
      currentX += sortedRects[index - 1].width + margin;

      // If rectangles go off the screen, move to the next row
      if (currentX + rect.width > window.innerWidth) {
        currentX = 0;
        currentY += maxHeight + margin;
        maxHeight = 0;
      }
    }

    if (rect.height > maxHeight) {
      maxHeight = rect.height;
    }

    return {
      ...rect,
      left: currentX,
      top: currentY,
    };
  });
}
