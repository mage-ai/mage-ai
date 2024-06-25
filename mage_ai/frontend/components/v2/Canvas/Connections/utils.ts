import { NodeItemType, RectType } from '../interfaces';
import { ConnectionType } from '../interfaces';
import { getBlockConnectionUUID } from '../Draggable/utils';

export function createConnection(
  fromItem: NodeItemType,
  toItem: NodeItemType,
  options?: Partial<ConnectionType>,
): ConnectionType {
  // Default the positions to 'right' and 'left' if not specified
  const defaultOptions: Omit<ConnectionType, 'from' | 'to'> = {
    curveControl: 0,
    fromPosition: 'right',
    id: null,
    toPosition: 'left',
  };

  const conn = {
    from: fromItem.id.toString(),
    fromItem,
    to: toItem.id.toString(),
    toItem,
    ...defaultOptions,
    ...options,
  };
  conn.id = conn.from;

  return conn as ConnectionType;
}

export function connectionUUID({ from, fromItem, to, toItem }: ConnectionType): string {
  if (fromItem?.block && toItem?.block) {
    return [
      fromItem?.block ? getBlockConnectionUUID(fromItem?.block) : '',
      toItem?.block ? getBlockConnectionUUID(toItem?.block) : '',
    ].join('-');
  } else if (
    (fromItem?.target?.block || fromItem?.block) &&
    (toItem?.target?.block || toItem?.block)
  ) {
    return [
      getBlockConnectionUUID((fromItem?.target || fromItem)?.block),
      getBlockConnectionUUID((toItem?.target || toItem)?.block),
    ].join('-');
  }

  return `${from}-${to}`;
}

function getAnchorPosition({ left, height, top, width }: RectType, position?: string) {
  switch (position) {
    case 'top':
      return { x: left + width / 2, y: top };
    case 'bottom':
      return { x: left + width / 2, y: top + height };
    case 'left':
      return { x: left, y: top + height / 2 };
    case 'right':
      return { x: left + width, y: top + height / 2 };
    case 'middle':
      return { x: left + width / 2, y: top + height / 2 };
    default:
      return { x: left + width / 2, y: top + height / 2 }; // Default to middle
  }
}

function calculatePosition(
  {
    curveControl: curveControlArg,
    fromPosition: fromPositionArg,
    toPosition: toPositionArg,
  }: ConnectionType,
  fromRect: RectType,
  toRect: RectType,
) {
  const fromPosition = getAnchorPosition(fromRect, fromPositionArg);
  const toPosition = getAnchorPosition(toRect, toPositionArg);
  const { x: startX, y: startY } = fromPosition;
  const { x: endX, y: endY } = toPosition;

  const curveControl = curveControlArg ?? 0.5; // Default curve control value

  // Calculate control points for a smooth curve
  const controlPointX1 = startX + (endX - startX) * curveControl;
  const controlPointY1 = startY;
  const controlPointX2 = endX - (endX - startX) * curveControl;
  const controlPointY2 = endY;

  return {
    endX,
    endY,
    startX,
    startY,
    x1: controlPointX1,
    x2: controlPointX2,
    y1: controlPointY1,
    y2: controlPointY2,
  };
}

export function getPathD(
  opts: {
    curveControl?: number;
    fromPosition?: 'top' | 'bottom' | 'left' | 'right' | 'middle'; // Position where the connection starts
    toPosition?: 'top' | 'bottom' | 'left' | 'right' | 'middle'; // Position where the connection ends
  },
  fromRect: RectType,
  toRect: RectType,
): string {
  const { endX, endY, startX, startY, x1, x2, y1, y2 } = calculatePosition(
    opts as ConnectionType,
    fromRect,
    toRect,
  );

  return `M${startX},${startY} C${x1},${y1} ${x2},${y2} ${endX},${endY}`;
}

export function parsePathD(d: string): any {
  // Use regular expression to extract the values from the d attribute
  const pathRegex =
    /M\s*([\d.]+),([\d.]+)\s*C\s*([\d.]+),([\d.]+)\s*([\d.]+),([\d.]+)\s*([\d.]+),([\d.]+)/;
  const match = pathRegex.exec(d);

  if (!match) {
    throw new Error('Invalid path data');
  }

  // We know the structure of the path data, so we can map the captured groups
  const [, startX, startY, x1, y1, x2, y2, endX, endY] = match.map(Number);

  return { startX, startY, x1, y1, x2, y2, endX, endY };
}
