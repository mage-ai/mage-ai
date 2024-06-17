import update from 'immutability-helper';
import { NodeItemType, PortType, RectType } from '../../../Canvas/interfaces';
import { ItemTypeEnum } from '../../../Canvas/types';
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
  const { endX, endY, startX, startY, x1, x2, y1, y2 } = calculatePosition(
    connection,
    fromRect,
    toRect,
  );

  return `M${startX},${startY} C${x1},${y1} ${x2},${y2} ${endX},${endY}`;
}

export function getConnections(
  node: NodeItemType,
  connections: Record<string, ConnectionType>,
): ConnectionType[] {
  return Object.values(connections || {}).reduce((acc, connection) => {
    const { id, type } = node;
    const { fromItem, toItem } = connection;

    if (
      (fromItem.type === type && fromItem.id === id) ||
      (toItem.type === type && toItem.id === id) ||
      (fromItem?.parent?.type === type && fromItem?.parent?.id === id) ||
      (toItem?.parent?.type === type && toItem?.parent?.id === id)
    ) {
      return acc.concat(connection);
    }

    return acc;
  }, []);
}

export function updatePaths(
  node: NodeItemType,
  connectionsRef: {
    current: Record<string, ConnectionType>;
  },
  opts?: {
    onlyUpdateTypes?: {
      connection?: {
        uuid: string;
      };
      fromItem: {
        type: ItemTypeEnum;
      };
      toItem: {
        type: ItemTypeEnum;
      };
    };
  },
) {
  const { onlyUpdateTypes } = opts || {};
  const { id, type } = node;

  const conns = getConnections(node, connectionsRef.current);
  // console.log(id, conns)
  conns?.forEach((connection: ConnectionType) => {
    const connUUID = connectionUUID(connection);

    const { fromItem, toItem } = connection;
    const isFrom = fromItem.type === type && fromItem.id === id;
    const isTo = toItem.type === type && toItem.id === id;
    const isFromParent = fromItem?.parent?.type === type && fromItem?.parent?.id === id;
    const isToParent = toItem?.parent?.type === type && toItem?.parent?.id === id;

    const shouldUpdate = !onlyUpdateTypes
      ? true
      : (!onlyUpdateTypes?.fromItem || onlyUpdateTypes?.fromItem?.type === fromItem?.type) &&
        (!onlyUpdateTypes?.toItem || onlyUpdateTypes?.toItem?.type === toItem?.type) &&
        (!onlyUpdateTypes?.connection || onlyUpdateTypes?.connection?.uuid === connUUID);

    // console.log('shouldUpdate', shouldUpdate);

    if (!shouldUpdate) {
      return;
    }

    let connectionUpdate = null;

    if (isFrom || isFromParent) {
      if (isFromParent) {
        if (connection?.fromItem?.rect) {
          const leftD = connection.fromItem.rect.left - connection.fromItem.parent.rect.left;
          const topD = connection.fromItem.rect.top - connection.fromItem.parent.rect.top;

          connectionUpdate = update(connection, {
            fromItem: {
              parent: {
                rect: {
                  $merge: node.rect,
                },
              },
              rect: {
                left: {
                  $set: node.rect.left + leftD,
                },
                top: {
                  $set: node.rect.top + topD,
                },
              },
            },
          });
        }
      } else {
        connectionUpdate = update(connection, {
          fromItem: {
            $merge: node,
          },
        });
      }
    } else if (isTo || isToParent) {
      if (isToParent) {
        if (connection?.toItem?.rect) {
          const leftD = connection.toItem.rect.left - connection.toItem.parent.rect.left;
          const topD = connection.toItem.rect.top - connection.toItem.parent.rect.top;

          connectionUpdate = update(connection, {
            toItem: {
              parent: {
                rect: {
                  $merge: node.rect,
                },
              },
              rect: {
                left: {
                  $set: node.rect.left + leftD,
                },
                top: {
                  $set: node.rect.top + topD,
                },
              },
            },
          });
        }
      } else {
        connectionUpdate = update(connection, {
          toItem: {
            $merge: node,
          },
        });
      }
    }

    // console.log(
    //   'Will it update?',
    //   connectionUpdate,
    //   isFrom || isFromParent,
    //   isTo || isToParent,
    //   connection?.fromItem?.rect,
    //   connection?.toItem?.rect,
    // );

    if (connectionUpdate && connectionUpdate?.fromItem?.rect && connectionUpdate?.toItem?.rect) {
      const pathElement = document.getElementById(connUUID);

      if (pathElement) {
        const pathD = getPathD(
          connectionUpdate,
          connectionUpdate.fromItem.rect,
          connectionUpdate.toItem.rect,
        );

        pathElement.setAttribute('d', pathD);
        connectionsRef.current[connUUID] = connectionUpdate;
      }
    }
  });
}
