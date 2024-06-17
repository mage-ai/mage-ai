export function snapToGrid(
  { x, y }: { x: number; y: number },
  gridDimensions?: { height: number; width: number },
): [number, number] {
  const { height, width } = gridDimensions || { height: 32, width: 32 };
  const snappedX = Math.floor(x / width) * width;
  const snappedY = Math.floor(y / height) * height;
  return [snappedX, snappedY];
}
