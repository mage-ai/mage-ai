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
