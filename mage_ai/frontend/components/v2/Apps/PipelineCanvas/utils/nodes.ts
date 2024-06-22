import { applyRectDiff, getRectDiff } from '../../../Canvas/utils/rect';
import { DragItem, NodeType, ItemMappingType,
  ConnectionMappingType,
  ModelMappingType,
  ModelRefsType,
  PortMappingType } from '../../../Canvas/interfaces';
import { ItemTypeEnum, PortSubtypeEnum } from '../../../Canvas/types';
import { isDebug } from '@utils/environment';
import { buildUUIDForLevel } from './levels';
import { ignoreKeys } from '@utils/hash';

export function updateNodeGroupsWithItems(
  itemMapping: ItemMappingType,
): ItemMappingType {
  false &&
  isDebug() && console.log(
    'updateNodeGroupsWithItems',
    'itemMapping', itemMapping,
    'itemMapping', itemMapping,
  );

  const mapping = Object.entries(itemMapping ?? {})?.reduce((
    acc,
    [nodeID, nodeItem]: [string, NodeType],
  ) =>  {
    if (ItemTypeEnum.NODE !== nodeItem?.type) {
      return acc;
    }

    const items = nodeItem?.items?.reduce((acc, item: DragItem) => ({
      ...acc,
      [item.id]: itemMapping?.[item?.id],
    }), {});

    return {
      ...acc,
      [nodeID]: {
        ...nodeItem,
        items: Object.values(items),
      },
    };
  }, {} as ItemMappingType);

  return Object.entries(mapping ?? {})?.reduce((
    acc,
    [nodeID, nodeItem]: [string, NodeType],
  ) =>  ({
    ...acc,
    [nodeID]: {
      ...nodeItem,
      upstreamNodes: nodeItem?.upstreamNodes?.map((node: NodeType) => mapping?.[node?.id]),
    },
  }), {} as ItemMappingType);
}

export function updateModelsAndRelationships({
  connectionsRef,
  itemsRef,
  portsRef,
}: ModelRefsType, payload?: ModelMappingType) {
  const {
    connectionMapping,
    itemMapping,
    portMapping,
  } = payload ?? {};

  // 1. Items are updated
  // 2. Item’s ports are updated
  // 3. Nodes and node’s items are updated
  // 4. Connection’s fromItem and toItem are updated

  false && isDebug() && console.log(
    'updateModelsAndRelationships before',
    'itemsRef', itemsRef?.current,
    'portsRef', portsRef?.current,
    'connectionsRef', connectionsRef?.current,
    'payload', payload,
    Object.values(payload?.connectionMapping ?? {})?.map(conn => [conn.fromItem?.id, conn.toItem?.id]),
  );

  Object.values({
    ...itemsRef.current,
    ...itemMapping,
  } ?? {}).forEach((item: DragItem) => {
    if (ItemTypeEnum.NODE === item?.type) {
      return;
    }

    const arr = [];

    (item?.ports ?? [])?.forEach((port) => {
      const port2 = {
        ...port,
        ...portsRef?.current?.[port?.id],
        ...portMapping?.[port?.id],
        parent: ignoreKeys(item, ['ports']),
      };

      if (item?.rect && item?.rect?.diff && !port2?.rect) {
        const rect1 = port2?.rect;
        const diff = getRectDiff(item?.rect, item?.rect?.diff);
        const rect2 = applyRectDiff(rect1, diff);
        port2.rect = {
          ...rect2,
          diff: rect1,
        };
      }
      arr.push(port2);
    });

    item.ports = arr;
    itemsRef.current[item.id] = item;

    portsRef.current = {
      ...portsRef.current,
      ...arr.reduce((acc, port) => ({ ...acc, [port.id]: port }), {}),
    };
  });

  Object.entries({
    ...itemsRef.current,
    ...itemMapping,
  } ?? {}).forEach(([nodeID, nodeInit]: [string, NodeType]) => {
    if (ItemTypeEnum.NODE !== nodeInit?.type) {
      return;
    }

    const node = {
      ...nodeInit,
      ...itemsRef.current?.[nodeID],
      ...itemMapping?.[nodeID],
    };
    const items = node?.items?.reduce((acc, item: DragItem) => ({ ...acc, [item.id]: itemsRef?.current?.[item?.id] }), {});
    node.items = Object.values(items ?? {});
    itemsRef.current[nodeID] = node;
  });
  Object.entries(itemsRef.current ?? {}).forEach(([nodeID, nodeItem]: [string, NodeType]) => {
    nodeItem.upstreamNodes = nodeItem?.upstreamNodes?.map((node: NodeType) => itemsRef.current[node?.id]);
    itemsRef.current[nodeID] = nodeItem;
  });

  Object.entries({
    ...connectionsRef.current,
    ...connectionMapping,
  }).forEach(([key, conn]: [string, any]) => {
    const { fromItem, toItem } = conn;
    conn.fromItem = portsRef.current[fromItem?.id];
    conn.toItem = portsRef.current[toItem?.id];
    connectionsRef.current[key] = conn;
  });

  false &&
  isDebug() && console.log(
    'updateModelsAndRelationships after',
    'itemsRef', itemsRef?.current,
    'portsRef', portsRef?.current,
    'connectionsRef', connectionsRef?.current,
    Object.values(connectionsRef?.current ?? {})?.map(conn => [conn.fromItem, conn.toItem]),
  );

  return {
    connectionsRef,
    itemsRef,
    portsRef,
  };
}
