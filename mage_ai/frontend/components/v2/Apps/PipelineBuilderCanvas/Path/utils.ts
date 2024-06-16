import { NodeType } from '../interfaces';

export function getPath(from: NodeType, to: NodeType): string {
  const startX = from.left + 50; // Assuming node width is 100
  const startY = from.top + 25;  // Assuming node height is 50
  const endX = to.left + 50;     // Assuming node width is 100
  const endY = to.top + 25;      // Assuming node height is 50

  return `M ${startX},${startY} C ${startX + 100},${startY} ${endX - 100},${endY} ${endX},${endY}`;
}
