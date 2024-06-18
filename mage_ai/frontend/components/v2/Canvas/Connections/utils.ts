import update from 'immutability-helper';
import { NodeItemType, PortType, RectType } from '../interfaces';
import { ItemTypeEnum } from '../types';
import { ConnectionType } from './interfaces';
import { getBlockColor } from '@mana/themes/blocks';
import styles from '@styles/scss/elements/Path.module.scss';
import stylesPathGradient from '@styles/scss/elements/PathGradient.module.scss';

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
    pathProps?: {
      classNames?: string[];
    },
    stop0Props?: {
      classNames?: string[];
    },
    stop1Props?: {
      classNames?: string[];
    },
  },
) {
  const { onlyUpdateTypes, pathProps, stop0Props, stop1Props } = opts || {};
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
          // This use to fix an issue but now it causes the issue when the page first loads,
          // the connections are in the top left corner of the canvas while the nodes are centered
          // in the middle of the 5000x5000 canvas.
          const leftD = true ? 0 : connection.fromItem.rect.left - connection.fromItem.parent.rect.left;
          const topD = true ? 0 : connection.fromItem.rect.top - connection.fromItem.parent.rect.top;

          // console.log([
          //   connection.fromItem.rect.left - connection.fromItem.parent.rect.left,
          //   connection.fromItem.rect.top - connection.fromItem.parent.rect.top,
          //   connection.fromItem.rectTransformedDiff.left, connection.fromItem.parent.rect.left,
          //   connection.fromItem.rectTransformedDiff.top, connection.fromItem.parent.rect.top,
          // ]);
          //
          // console.log('Before Calculation');
          // console.log({
          //   fromRect: connection.fromItem.rect,
          //   fromParentRect: connection.fromItem.parent.rect,
          //   fromTransformedDiff: connection.fromItem.rectTransformedDiff,
          // });

          // const leftDiff = connection.fromItem.rect.left - connection.fromItem.parent.rect.left;
          // const topDiff = connection.fromItem.rect.top - connection.fromItem.parent.rect.top;
          // const transformedLeftDiff = connection.fromItem.rectTransformedDiff.left - connection.fromItem.parent.rect.left;
          // const transformedTopDiff = connection.fromItem.rectTransformedDiff.top - connection.fromItem.parent.rect.top;

          // console.log([
          //   leftDiff, topDiff,
          //   transformedLeftDiff, connection.fromItem.rectTransformedDiff.left,
          //   transformedTopDiff, connection.fromItem.rectTransformedDiff.top,
          // ]);

          // console.log('After Calculation');

          // console.log(
          //   connection.fromItem.child,
          // );

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
          // This use to fix an issue but now it causes the issue when the page first loads,
          // the connections are in the top left corner of the canvas while the nodes are centered
          // in the middle of the 5000x5000 canvas.
          const leftD = true ? 0 : connection.toItem.rect.left - connection.toItem.parent.rect.left;
          const topD = true ? 0 : connection.toItem.rect.top - connection.toItem.parent.rect.top;

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
    //

    if (connectionUpdate && connectionUpdate?.fromItem?.rect && connectionUpdate?.toItem?.rect) {
      const pathElement = document.getElementById(connUUID);
      // console.log(pathProps?.classNames, pathElement);

      if (pathElement) {
        const pathD = getPathD(
          connectionUpdate,
          connectionUpdate.fromItem.rect,
          connectionUpdate.toItem.rect,
        );

        const element0 = document.getElementById(`${connUUID}-stop-0`);
        const element1 = document.getElementById(`${connUUID}-stop-1`);

        if (element0 && element1) {
          const fromColor = getBlockColor(connectionUpdate?.fromItem?.parent?.block?.type)?.names?.base;
          const toColor = getBlockColor(connectionUpdate?.toItem?.parent?.block?.type)?.names?.base;

          [
            stylesPathGradient.stop,
            stylesPathGradient[`stop-color-${fromColor}`],
          ].forEach((classNames) => {
            element0.classList.add(classNames);
          });

          [
            stylesPathGradient.stop,
            stylesPathGradient[`stop-color-${toColor}`],
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

        // pathElement.setAttribute('stroke', pathProps.classNames);

        pathElement.setAttribute('d', pathD);
        connectionsRef.current[connUUID] = connectionUpdate;
      }
    }
  });
}
