import update from 'immutability-helper';
import { NodeItemType, PortType, RectType } from '../interfaces';
import { ItemTypeEnum } from '../types';
import { ConnectionType } from '../interfaces';
import { getBlockColor } from '@mana/themes/blocks';
import styles from '@styles/scss/elements/Path.module.scss';
import stylesPathGradient from '@styles/scss/elements/PathGradient.module.scss';
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

export function connectionUUID({ from, fromItem, to, toItem }: ConnectionType): string {
  if ((fromItem?.target?.block || fromItem?.block) && (toItem?.target?.block || toItem?.block)) {
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

    if (!shouldUpdate) {
      return;
    }

    let connectionUpdate = null;

    if (isFrom || isFromParent) {
      if (isFromParent) {
        if (connection?.fromItem?.rect) {
          connectionUpdate = update(connection, {
            fromItem: {
              parent: {
                rect: {
                  $merge: node.rect,
                },
              },
              rect: {
                left: {
                  $set: node.rect.left + (connection.fromItem.rect.offsetLeft || 0),
                },
                top: {
                  $set: node.rect.top + (connection.fromItem.rect.offsetTop || 0),
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
          connectionUpdate = update(connection, {
            toItem: {
              parent: {
                rect: {
                  $merge: node.rect,
                },
              },
              rect: {
                left: {
                  $set: node.rect.left + (connection.toItem.rect.offsetLeft || 0),
                },
                top: {
                  $set: node.rect.top + (connection.toItem.rect.offsetTop || 0),
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

    if (connectionUpdate && connectionUpdate?.fromItem?.rect && connectionUpdate?.toItem?.rect) {
      const pathElement = document.getElementById(connUUID);

      if (pathElement) {
        const pathD = getPathD(
          connectionUpdate,
          connectionUpdate.fromItem.rect,
          connectionUpdate.toItem.rect,
        );

        const element0 = document.getElementById(`${connUUID}-stop-0`);
        const element1 = document.getElementById(`${connUUID}-stop-1`);

        if (element0 && element1) {
          const fromColor = getBlockColor(connectionUpdate?.fromItem?.block?.type)?.names?.base;
          const toColor = getBlockColor(connectionUpdate?.toItem?.block?.type)?.names?.base;

          // Reverse the colors so that the port color is the same as the half side of the line
          // that protrudes from the block.
          [
            stylesPathGradient.stop,
            stylesPathGradient[`stop-color-${toColor}`],
          ].forEach((classNames) => {
            element0.classList.add(classNames);
          });

          [
            stylesPathGradient.stop,
            stylesPathGradient[`stop-color-${fromColor}`],
          ].forEach((classNames) => {
            element1.classList.add(classNames);
          });
        } else {
          const colorName = getBlockColor(node?.block?.type)?.names?.base;
          [
            styles.path,
            styles[`stroke-color-${colorName}`],
          ].forEach((classNames) => {
            pathElement.classList.add(classNames);
          });
        }

        pathElement.setAttribute('d', pathD);
        connectionsRef.current[connUUID] = connectionUpdate;
      }
    }
  });
}
