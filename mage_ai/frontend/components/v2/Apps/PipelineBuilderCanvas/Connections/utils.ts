import { NodeItemType, RectType } from '../../../Canvas/interfaces';
import { ConnectionType } from './interfaces';

export function createConnection(
  fromItem: NodeItemType,
  toItem: NodeItemType,
  options?: Partial<ConnectionType>,
): ConnectionType {
  // Default the positions to 'right' and 'left' if not specified
  const defaultOptions: Omit<ConnectionType, 'from' | 'to'> = {
    curveControl: 0.5,
    fromPosition: 'right',
    toPosition: 'left',
  };

  return {
    from: fromItem.id.toString(),
    fromItem,
    to: toItem.id.toString(),
    toItem,
    ...defaultOptions,
    ...options,
  };
}

export function connectionUUID({ from, to }: ConnectionType): string {
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

function calculatePosition(connection: ConnectionType, fromRect: RectType, toRect: RectType) {
  const fromPosition = getAnchorPosition(fromRect, connection.fromPosition);
  const toPosition = getAnchorPosition(toRect, connection.toPosition);
  const { x: startX, y: startY } = fromPosition;
  const { x: endX, y: endY } = toPosition;

  const curveControl = connection.curveControl ?? 0.5; // Default curve control value

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

export function getPathD(connection: ConnectionType, fromRect: RectType, toRect: RectType): string {
  const {
    endX,
    endY,
    startX,
    startY,
    x1,
    x2,
    y1,
    y2,
  } = calculatePosition(connection, fromRect, toRect);

  return `M${startX},${startY} C${x1},${y1} ${x2},${y2} ${endX},${endY}`;
}

function getConnections(uuid: number | string, connections: Record<string, ConnectionType>): ConnectionType[] {
  return Object.values(connections || {}).reduce((acc, connection) => {
    if (connection.from === uuid || connection.to === uuid) {
      return acc.concat(connection);
    }

    return acc;
  }, []);
}

export function updatePaths(
  item: NodeItemType,
  connectionsRef: {
    current: Record<string, ConnectionType>;
  },
) {
  const itemID = item.id;

  getConnections(itemID, connectionsRef.current)?.forEach((connection: ConnectionType) => {
    const connUUID = connectionUUID(connection);
    const pathElement = document.getElementById(connUUID);


    if (connection.from === itemID) {
      connection.fromItem = item;
    } else if (connection.to === itemID) {
      connection.toItem = item;
    }

    const pathD = getPathD(
      connection,
      connection?.fromItem?.rect as RectType,
      connection?.toItem?.rect as RectType,
    );
    pathElement.setAttribute('d', pathD);

    connectionsRef.current[connUUID] = connection;
  });
}
