import update from 'immutability-helper';
import BlockType from '@interfaces/BlockType';
import {
  DragItem,
  PortType,
  GroupMappingType,
  ModelMappingType,
  ConnectionMappingType,
  NodeItemMappingType,
  ItemMappingType,
  PortMappingType,
  BlocksByGroupType,
  NodeType,
} from '../../../Canvas/interfaces';
import { createConnections } from './ports';
import { blocksToGroupMapping } from './pipelines';
import { buildUUIDForLevel } from './levels';
import { buildPortUUID } from '../../../Canvas/Draggable/utils';
import { PortSubtypeEnum, ItemTypeEnum } from '../../../Canvas/types';
import { createConnection } from '../../../Canvas/Connections/utils';
import { ConnectionType } from '../../../Canvas/interfaces';
import {
  SetupOpts,
  layoutItems,
  layoutRectsInContainer,
  layoutItemsInTreeFormation,
} from '../../../Canvas/utils/rect';
import { indexBy } from '@utils/array';
import { PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { isDebug } from '@utils/environment';
import { ignoreKeys } from '@utils/hash';

export function initializeBlocksAndConnections(
  blocksInitArg: BlockType[],
  mappings?: {
    groupMapping: GroupMappingType;
  },
  opts?: SetupOpts,
): ModelMappingType {
  const { groupMapping } =
    mappings ||
    ({} as {
      groupMapping: GroupMappingType;
    });

  const { level } = opts || {};

  const blocks: BlockType[] = [];
  const blockMapping: Record<string, BlockType> = {};
  const blockUpsDownsMapping: Record<
    string,
    {
      downstream_blocks: Record<string, BlockType>;
      upstream_blocks: Record<string, BlockType>;
    }
  > = {};
  const connectionMapping: Record<string, ConnectionType> = {};
  const portMapping: Record<string, PortType> = {};

  const blocksInit =
    level ?? false
      ? blocksInitArg.map((block: BlockType) => ({
          ...block,
          downstream_blocks: block?.downstream_blocks?.map((buuid: string) =>
            buildUUIDForLevel(buuid, level),
          ),
          upstream_blocks: block?.upstream_blocks?.map((buuid: string) =>
            buildUUIDForLevel(buuid, level),
          ),
          uuid: buildUUIDForLevel(block.uuid, level),
        }))
      : blocksInitArg;

  blocksInit.forEach((block: BlockType) => {
    blockUpsDownsMapping[block.uuid] ||= {
      downstream_blocks: {},
      upstream_blocks: {},
    };

    block?.downstream_blocks?.forEach((uuid: string) => {
      blockUpsDownsMapping[uuid] ||= {
        downstream_blocks: {},
        upstream_blocks: {},
      };
      blockUpsDownsMapping[uuid].upstream_blocks ||= {};
      blockUpsDownsMapping[uuid].upstream_blocks[block.uuid] = block;

      const downstreamBlock = blocksInit.find(b => b.uuid === uuid);
      if (downstreamBlock) {
        blockUpsDownsMapping[block.uuid].downstream_blocks ||= {};
        blockUpsDownsMapping[block.uuid].downstream_blocks[uuid] = downstreamBlock;
      }
    });

    block?.upstream_blocks?.forEach((uuid: string) => {
      blockUpsDownsMapping[uuid] ||= {
        downstream_blocks: {},
        upstream_blocks: {},
      };
      blockUpsDownsMapping[uuid].downstream_blocks ||= {};
      blockUpsDownsMapping[uuid].downstream_blocks[block.uuid] = block;

      const upstreamBlock = blocksInit.find(b => b.uuid === uuid);
      if (upstreamBlock) {
        blockUpsDownsMapping[block.uuid].upstream_blocks ||= {};
        blockUpsDownsMapping[block.uuid].upstream_blocks[uuid] = upstreamBlock;
      }
    });
  });

  blocksInit.forEach((block: BlockType) => {
    const block2 = {
      ...block,
      ...Object.entries(blockUpsDownsMapping[block.uuid] || {}).reduce(
        (acc, [key, obj]: [string, Record<string, BlockType>]) => ({
          ...acc,
          [key]: Object.values(obj)?.map(b => b.uuid),
        }),
        {},
      ),
    };

    blocks.push(block2);
    blockMapping[block.uuid] = block2;
  });

  const itemsInit: DragItem[] = blocks?.map(block => ({
    block,
    id: block.uuid,
    level,
    rect: null,
    title: block.name || block.uuid,
    type: ItemTypeEnum.BLOCK,
  })) as DragItem[];

  // let rects = layoutItems(itemsInit, opts);
  // rects = layoutRectsInContainer(rects, opts?.layout);
  // const rectItems = layoutItemsInTreeFormation(itemsInit.map((i, idx) => ({
  //   ...i,
  //   rect: rects[idx],
  // })), opts?.layout);
  const itemMapping: Record<string, DragItem> = indexBy(itemsInit, i => i.id);

  const downFlowPorts = {};
  // Create ports
  Object.entries(blockUpsDownsMapping)?.forEach(
    ([blockUUID, map]: [
      string,
      {
        downstream_blocks: Record<string, BlockType>;
        upstream_blocks: Record<string, BlockType>;
      },
    ]) => {
      const block = blockMapping?.[blockUUID];
      const parentItem: DragItem = itemMapping[blockUUID];

      if (!parentItem) return;

      const ports: PortType[] = [];

      const { downstream_blocks: dnBlocks, upstream_blocks: upBLocks } = map || {
        downstream_blocks: {},
        upstream_blocks: {},
      };

      Object.entries({
        [PortSubtypeEnum.INPUT]: upBLocks,
        [PortSubtypeEnum.OUTPUT]: dnBlocks,
      }).forEach(([subtype, map]: [PortSubtypeEnum, Record<string, BlockType>]) => {
        Object.values(map)?.forEach((targetBlock: BlockType, index: number) => {
          const targetItem = itemMapping[targetBlock.uuid];
          const port: PortType = {
            block,
            id: null,
            index,
            level,
            parent: { ...parentItem, block },
            subtype,
            target: { ...targetItem, block: targetBlock },
            type: ItemTypeEnum.PORT,
          };

          port.id = buildPortUUID(null, {
            fromBlock: block,
            toBlock: targetBlock,
          });

          let downwardsID = null;

          if (PortSubtypeEnum.INPUT === port?.subtype) {
            downwardsID = buildPortUUID(null, {
              fromBlock: targetBlock,
              toBlock: block,
            });
          } else if (PortSubtypeEnum.OUTPUT === port?.subtype) {
            downwardsID = buildPortUUID(null, {
              fromBlock: block,
              toBlock: targetBlock,
            });
          }
          ports.push(port);
          downFlowPorts[downwardsID] = port;
          portMapping[port.id] = port;
        });
      });

      const itemWithPorts = update(parentItem, {
        ports: { $set: ports },
      });

      itemMapping[blockUUID] = itemWithPorts;
    },
  );

  const portMappingFinal: Record<string, PortType> = {};
  Object.values(itemMapping).forEach((item: DragItem) => {
    (item?.ports ?? []).forEach((port: PortType) => {
      const { parent, target } = port;
      port.parent = ignoreKeys(itemMapping[parent.block.uuid], ['ports']);
      port.target = ignoreKeys(itemMapping[target.block.uuid], ['ports']);
      portMappingFinal[port.id] = port;
    });
  });

  // Create connections; the fromItem and toItem MUST be ports, NOT blocks.
  Object.values(downFlowPorts)?.forEach((port: PortType) => {
    let fromItemBlock = null;
    let toItemBlock = null;

    if (PortSubtypeEnum.INPUT === port?.subtype) {
      fromItemBlock = port?.target?.block;
      toItemBlock = port?.parent?.block;
    } else {
      fromItemBlock = port?.parent?.block;
      toItemBlock = port?.target?.block;
    }

    const fromItem = itemMapping[fromItemBlock.uuid];
    const toItem = itemMapping[toItemBlock.uuid];

    const fromPort = fromItem?.ports?.find(
      p => p?.target?.block?.uuid === toItemBlock?.uuid && p.subtype === PortSubtypeEnum.OUTPUT,
    );
    const toPort = toItem?.ports?.find(
      p => p?.target?.block?.uuid === fromItemBlock?.uuid && p.subtype === PortSubtypeEnum.INPUT,
    );

    fromPort.rect = { ...fromItem.rect };
    toPort.rect = { ...toItem.rect };

    const connection = createConnection(fromPort, toPort, { level });
    connectionMapping[connection.id] = connection;
  });

  // {
  //   "load": {
  //     "level_2--ingest": {
  //       "uuid": "level_2--ingest",
  //       "type": "group",
  //       "upstream_blocks": [],
  //       "downstream_blocks": [
  //         "level_2--map"
  //       ],
  //       "groups": [
  //         "load"
  //       ]
  //     },
  //     "level_2--map": {
  //       "uuid": "level_2--map",
  //       "type": "group",
  //       "upstream_blocks": [
  //         "level_2--ingest"
  //       ],
  //       "downstream_blocks": [],
  //       "groups": [
  //         "load"
  //       ]
  //     }
  //   },
  // }
  const blocksByGroup = blocksToGroupMapping(Object.values(blockMapping ?? {}) ?? []);
  const nodeItemMapping = {} as NodeItemMappingType;

  if (blocksByGroup && groupMapping) {
    Object.entries(groupMapping).forEach(
      ([groupIDBase, group]: [string, PipelineExecutionFrameworkBlockType]) => {
        // they key is the base key, but the keys from the value have the level in them
        // "level_2--ingest": {}
        // "level_2--map": {}
        const blocksInGroup = blocksByGroup?.[groupIDBase] || [];
        const groupID = buildUUIDForLevel(groupIDBase, level);

        false &&
          isDebug() &&
          console.log(
            groupIDBase,
            groupID,
            'blocksByGroup',
            blocksByGroup,
            'blocksInGroup',
            Object.keys(blocksInGroup),
            'itemMapping',
            itemMapping,
          );
        nodeItemMapping[groupID] = {
          block: {
            ...group,
            uuid: groupID,
          },
          id: groupID,
          // The level key is already baked in.
          items: Object.keys(blocksInGroup)?.map((buuid: string) => itemMapping?.[buuid]),
          level,
          type: ItemTypeEnum.NODE,
        } as NodeType;
      },
    );
  }
  Object.entries(nodeItemMapping ?? {}).forEach(([groupID, node]: [string, NodeType]) => {
    const block = itemMapping[node?.block?.uuid];
    const upstreamNodes =
      node?.block?.upstream_blocks?.map(
        (buuid: string) => nodeItemMapping?.[buildUUIDForLevel(buuid, level)],
      ) ?? [];
    nodeItemMapping[groupID].upstreamNodes = upstreamNodes;
  });

  return {
    itemMapping: {
      ...itemMapping,
      ...nodeItemMapping,
    },
    portMapping: portMappingFinal,
  };
}
