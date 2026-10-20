import { applyRectDiff, getRectDiff } from '../../../Canvas/utils/rect';
import {
  DragItem,
  NodeType,
  ItemMappingType,
  ConnectionMappingType,
  ModelMappingType,
  ModelRefsType,
  PortType,
  PortMappingType,
} from '../../../Canvas/interfaces';
import { ItemTypeEnum, PortSubtypeEnum } from '../../../Canvas/types';
import { isDebug } from '@utils/environment';
import { buildUUIDForLevel } from './levels';
import { ignoreKeys } from '@utils/hash';

export function updateNodeGroupsWithItems(itemMapping: ItemMappingType): ItemMappingType {
  const mapping = Object.entries(itemMapping ?? {})?.reduce(
    (acc, [nodeID, nodeItem]: [string, NodeType]) => {
      if (ItemTypeEnum.NODE !== nodeItem?.type) {
        return acc;
      }

      const items = nodeItem?.items?.reduce(
        (acc, item: DragItem) => ({
          ...acc,
          [item.id]: itemMapping?.[item?.id],
        }),
        {},
      );

      return {
        ...acc,
        [nodeID]: {
          ...nodeItem,
          items: Object.values(items),
        },
      };
    },
    {} as ItemMappingType,
  );

  return Object.entries(mapping ?? {})?.reduce(
    (acc, [nodeID, nodeItem]: [string, NodeType]) => ({
      ...acc,
      [nodeID]: {
        ...nodeItem,
        upstreamNodes: nodeItem?.upstreamNodes?.map((node: NodeType) => mapping?.[node?.id]),
      },
    }),
    {} as ItemMappingType,
  );
}

export function updateModelsAndRelationships(
  { itemsRef, portsRef },
  payload: ModelMappingType,
): {
  items: ItemMappingType;
  ports: PortMappingType;
} {
  const { itemMapping, portMapping } = payload ?? {};

  const refsToUpdate = {
    items: {},
    ports: portMapping,
  };

  // 1. Ports are updated first!
  // 2. Items are updated
  // 3. Nodes and node’s items are updated
  // 4. Connection’s fromItem and toItem are updated

  Object.values(
    {
      ...itemsRef.current,
      ...itemMapping,
    } ?? {},
  ).forEach((item: DragItem) => {
    const arr = [];

    (item?.ports ?? [])?.forEach(port => {
      const port2 = {
        ...(portMapping?.[port?.id] ?? portsRef?.current?.[port?.id] ?? port),
        parent: ignoreKeys(item, ['ports']),
      };

      // Why are we doing this?
      // if (item?.rect && item?.rect?.diff && !port2?.rect) {
      //   const rect1 = port2?.rect;
      //   const diff = getRectDiff(item?.rect, item?.rect?.diff);
      //   const rect2 = applyRectDiff(rect1, diff);
      //   port2.rect = {
      //     ...rect2,
      //     diff: rect1,
      //   };
      // }
      arr.push(port2);
    });

    item.ports = arr;
    refsToUpdate.items[item.id] = item;

    refsToUpdate.ports = {
      ...portsRef.current,
      ...arr.reduce((acc, port) => ({ ...acc, [port.id]: port }), {}),
      ...refsToUpdate.ports,
    };
  });

  // Nodes
  Object.entries(refsToUpdate.items ?? {}).forEach(([nodeID, nodeInit]: [string, NodeType]) => {
    if (ItemTypeEnum.NODE !== nodeInit?.type) {
      return;
    }

    const node = {
      ...nodeInit,
      ...refsToUpdate.items[nodeID],
    };
    const items = node?.items?.reduce(
      (acc, item: DragItem) => ({
        ...acc,
        [item.id]: ignoreKeys(refsToUpdate.items?.[item?.id], ['node', 'ports']),
      }),
      {},
    );

    node.items = Object.values(items ?? {});
    refsToUpdate.items[nodeID] = node;
  });
  // Node upstream nodes
  Object.entries(refsToUpdate.items ?? {}).forEach(([nodeID, nodeItem]: [string, NodeType]) => {
    nodeItem.upstreamNodes = nodeItem?.upstreamNodes?.map(
      (node: NodeType) => refsToUpdate.items[node?.id],
    );
    refsToUpdate.items[nodeID] = nodeItem;
  });
  // Update non-node item’s node
  Object.entries(refsToUpdate.items ?? {}).forEach(([itemID, item]: [string, DragItem]) => {
    if (!item?.node) return;

    item.node = refsToUpdate.items[item?.node?.id] as NodeType;
    refsToUpdate.items[itemID] = ignoreKeys(item, ['items', 'upstreamNodes']);
  });

  return refsToUpdate;
}
