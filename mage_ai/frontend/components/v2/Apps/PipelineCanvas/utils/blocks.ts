import update from 'immutability-helper';
import BlockType from '@interfaces/BlockType';
import { DragItem, PortType, LayoutConfigType, RectType } from '../../../Canvas/interfaces';
import { buildPortUUID } from '../../../Canvas/Draggable/utils';
import {
  PortSubtypeEnum,
  ItemTypeEnum,
} from '../../../Canvas/types';
import { createConnection } from '../../../Canvas/Connections/utils';
import { ConnectionType } from '../../../Canvas/interfaces';
import { SetupOpts, layoutItems, layoutRectsInContainer, layoutItemsInTreeFormation } from '../../../Canvas/utils/rect';
import { indexBy } from '@utils/array';
import { layout } from 'styled-system';

export function initializeBlocksAndConnections(
  blocksInit: BlockType[],
  opts?: SetupOpts,
) {
  const blocks: BlockType[] = [];
  const blockMapping: Record<string, BlockType> = {};
  const blockUpsDownsMapping: Record<string, {
    downstream_blocks: Record<string, BlockType>,
    upstream_blocks: Record<string, BlockType>,
  }> = {};
  const connectionsMapping: Record<string, ConnectionType> = {};
  const portsMapping: Record<string, PortType> = {};

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

      const downstreamBlock = blocksInit.find((b) => b.uuid === uuid);
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

      const upstreamBlock = blocksInit.find((b) => b.uuid === uuid);
      if (upstreamBlock) {
        blockUpsDownsMapping[block.uuid].upstream_blocks ||= {};
        blockUpsDownsMapping[block.uuid].upstream_blocks[uuid] = upstreamBlock;
      }
    });
  });

  blocksInit.forEach((block: BlockType) => {
    const block2 = {
      ...block,
      ...Object.entries(blockUpsDownsMapping[block.uuid] || {}).reduce((
        acc, [key, obj]: [string, Record<string, BlockType>]
      ) => ({
        ...acc,
        [key]: Object.values(obj)?.map(b => b.uuid),
      }), {}),
    };

    blocks.push(block2);
    blockMapping[block.uuid] = block2;
  });

  const itemsInit: DragItem[] = blocks?.map(block => ({
    block,
    id: block.uuid,
    title: block.name || block.uuid,
    type: ItemTypeEnum.BLOCK,
  })) as DragItem[];

  let rects = layoutItems(itemsInit, opts);
  rects = layoutRectsInContainer(rects, opts?.layout);
  const rectItems = layoutItemsInTreeFormation(itemsInit.map((i, idx) => ({
    ...i,
    rect: rects[idx],
  })), opts?.layout);
  const itemsMapping: Record<string, DragItem> = indexBy(rectItems, i => i.id);

  const downFlowPorts = {};
  // Create ports
  Object.entries(blockUpsDownsMapping)?.forEach(([blockUUID, map]: [string, {
    downstream_blocks: Record<string, BlockType>,
    upstream_blocks: Record<string, BlockType>,
  }]) => {
    const block = blockMapping?.[blockUUID];
    const parentItem: DragItem = itemsMapping[blockUUID];

    if (!parentItem) return;

    const inputs: PortType[] = [];
    const outputs: PortType[] = [];

    const {
      downstream_blocks: dnBlocks,
      upstream_blocks: upBLocks,
    } = map || {
      downstream_blocks: {},
      upstream_blocks: {},
    };

    Object.entries({
      [PortSubtypeEnum.INPUT]: upBLocks,
      [PortSubtypeEnum.OUTPUT]: dnBlocks,
    }).forEach(([subtype, map]: [PortSubtypeEnum, Record<string, BlockType>]) => {
      Object.values(map)?.forEach((targetBlock: BlockType, index: number) => {
        const targetItem = itemsMapping[targetBlock.uuid];
        const port: PortType = {
          block,
          id: null,
          index,
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
          inputs.push(port);
        } else if (PortSubtypeEnum.OUTPUT === port?.subtype) {
          downwardsID = buildPortUUID(null, {
            fromBlock: block,
            toBlock: targetBlock,
          });
          outputs.push(port);
        }

        downFlowPorts[downwardsID] = port;

        portsMapping[port.id] = port;
      });
    });

    const itemWithPorts = update(parentItem, {
      inputs: { $set: inputs },
      outputs: { $set: outputs },
    });

    itemsMapping[blockUUID] = itemWithPorts;
  });

  const portsMappingFinal: Record<string, PortType> = {};
  Object.values(itemsMapping).forEach((item: DragItem) => {
    (item?.inputs || []).concat(item?.outputs || []).forEach((port: PortType) => {
      const { parent, target } = port;
      port.parent = itemsMapping[parent.block.uuid];
      port.target = itemsMapping[target.block.uuid];
      portsMappingFinal[port.id] = port;
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

    const fromItem = itemsMapping[fromItemBlock.uuid];
    const toItem = itemsMapping[toItemBlock.uuid];

    const fromPort = fromItem?.outputs?.find(p => p?.target?.block?.uuid === toItemBlock?.uuid);
    const toPort = toItem?.inputs?.find(p => p?.target?.block?.uuid === fromItemBlock?.uuid);

    fromPort.rect = { ...fromItem.rect };
    toPort.rect = { ...toItem.rect };

    const connection = createConnection(fromPort, toPort);
    connectionsMapping[connection.id] = connection;
  });

  return {
    connectionsMapping,
    itemsMapping,
    portsMapping: portsMappingFinal,
  };
}

// function getNextAvailablePosition(
//   level: number,
//   index: number,
//   parentPosition?: { left: number; top: number },
// ): { left: number; top: number } {
//   const offsetIndex = (index % 2 === 0 ? 0.1 : -0.1);
//   const actualHorizontalSpacing = horizontalSpacing * (1 + offsetIndex);
//   const actualVerticalSpacing = verticalSpacing * (1 + offsetIndex);

//   if (isHorizontal) {
//     const top = level * (blockHeight + verticalSpacing) + 20;
//     let left;
//     if (parentPosition) {
//       left = parentPosition.left + blockWidth + actualHorizontalSpacing;
//     } else {
//       left = columns[level].reduce((a, b) => Math.max(a, b)) + blockWidth + actualHorizontalSpacing;
//     }
//     return { left, top };
//   } else {
//     const left = level * (blockWidth + horizontalSpacing) + 20;
//     let top;
//     if (parentPosition) {
//       top = parentPosition.top + blockHeight + actualVerticalSpacing;
//     } else {
//       top = rows[level].reduce((a, b) => Math.max(a, b)) + blockHeight + actualVerticalSpacing;
//     }
//     return { left, top };
//   }
// }
