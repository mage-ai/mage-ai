import update from 'immutability-helper';
import { NodeItemType, ModelRefsType, OffsetType, PortType, RectType } from '../interfaces';
import { ItemTypeEnum } from '../types';
import { getBlockColor } from '@mana/themes/blocks';
import styles from '@styles/scss/elements/Path.module.scss';
import stylesPathGradient from '@styles/scss/elements/PathGradient.module.scss';
import { getBlockConnectionUUID, buildPortID } from '../Draggable/utils';
import { ConnectionType, DragItem } from '../interfaces';
import { getPathD } from '../Connections/utils';

function getConnectionsForPorts(item: DragItem, connectionsRef: { current: Record<string, ConnectionType> }) {
  const ports = item?.ports ?? [];
  const conns = Object.values(connectionsRef?.current || {});

  return ports?.reduce((acc, port) => {
    const conn = connectionsRef.current[port.id];
    if (conn) {
      acc.concat(conn);
    }
    acc.push(...conns.filter((c) => c.from === port.id || c.to === port.id));

    return acc;
  }, []);
}

export function updateAllPortConnectionsForItem(
  item: DragItem,
  modelRefs: ModelRefsType,
) {
  const {
    connectionsRef,
    itemsRef,
    portsRef,
  } = modelRefs;

  const conns = getConnectionsForPorts(item, connectionsRef) || [];

  conns.forEach((conn) => {
    if (conn.id in connectionsRef.current && conn.id in portsRef.current) {
      const port = portsRef.current[conn.id];
      updateConnectionPaths(item, port, conn, modelRefs);
    }
  });
}

function updateConnectionPaths(
  item: DragItem,
  port: PortType,
  conn: ConnectionType,
  modelRefs: ModelRefsType,
) {
  const {
    connectionsRef,
    itemsRef,
    portsRef,
  } = modelRefs;

  const { fromItem: fi, toItem: ti } = conn;
  const fromItem = portsRef.current[fi.id];
  const toItem = portsRef.current[ti.id];
  const { parent: p, target: t } = fromItem;
  const parent = itemsRef.current[p.id];
  const target = itemsRef.current[t.id];

  const isParent = item.block.uuid === parent.block.uuid;
  const isTarget = item.block.uuid === target.block.uuid;

  // If the item is the target in the connection, it has to reverse everything.
  const rect = { ...(isTarget ? toItem.rect : fromItem.rect) };
  const ancestor = isTarget ? target : parent;

  const offset: OffsetType = rect?.offset || { top: 0, left: 0 };

  rect.left = (item?.rect || ancestor?.rect).left + (offset?.left || 0);
  rect.top = (item?.rect || ancestor?.rect).top + (offset?.top || 0);

  const connItem = isTarget ? toItem : fromItem;
  connItem.rect = rect;
  conn[isTarget ? 'toItem' : 'fromItem'] = connItem;
  connectionsRef.current[conn.id] = conn;

  const pathElement = document.getElementById(String(conn.id));
  const pathD = getPathD(
    conn,
    isTarget ? (fromItem?.rect || fromItem?.target?.rect) : rect,
    isTarget ? rect : (toItem?.rect || toItem?.target?.rect),
  );
  console.log(item, conn, pathD);
  pathElement?.setAttribute('d', pathD);

  const element0 = document.getElementById(`${conn.id}-stop-0`);
  const element1 = document.getElementById(`${conn.id}-stop-1`);

  if (element0 && element1) {
    const fromColor = getBlockColor(fromItem?.block?.type)?.names?.base;
    const toColor = getBlockColor(toItem?.block?.type)?.names?.base;

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
  } else if (pathElement) {
    const colorName = getBlockColor(port?.block?.type)?.names?.base;
    [
      styles.path,
      styles[`stroke-color-${colorName}`],
    ].forEach((classNames) => {
      pathElement.classList.add(classNames);
    });
  }

  return conn.fromItem.rect;
}
