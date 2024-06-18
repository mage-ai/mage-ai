import update from 'immutability-helper';
import BlockType from '@interfaces/BlockType';
import { DragItem, PortType, LayoutConfigType, RectType } from '../../../Canvas/interfaces';
import { buildPortUUID, getBlockConnectionUUID } from '../../../Canvas/Draggable/utils';
import {
  PortSubtypeEnum,
  ItemTypeEnum,
  LayoutConfigDirectionEnum,
  LayoutConfigDirectionOriginEnum,
} from '../../../Canvas/types';
import { createConnection, connectionUUID } from '../../../Canvas/Connections/utils';
import { ConnectionType } from '../../../Canvas/interfaces';

export function initializeBlocksAndConnections(
  blocks: BlockType[],
  opts?: {
    blockHeight?: number;
    blockWidth?: number;
    horizontalSpacing?: number;
    layout?: LayoutConfigType;
    containerRect?: RectType
    verticalSpacing?: number;
  },
) {
  const {
    blockHeight = 200,
    blockWidth = 300,
    horizontalSpacing = 50,
    layout,
    containerRect,
    verticalSpacing = 200,
  } = opts || {};

  // Doesn’t change to vertical...
  const {
    direction: layoutDirection = LayoutConfigDirectionEnum.HORIZONTAL,
    origin: layoutOrigin = LayoutConfigDirectionOriginEnum.LEFT,
  } = layout || ({} as LayoutConfigType);

  const itemsMapping: Record<string, DragItem> = {};
  const connectionsMapping: Record<string, ConnectionType> = {};
  const portsMapping: Record<string, PortType> = {};

  const positions: Record<string, { left: number; top: number }> = {};
  const levels: Record<string, number> = {};
  const occupiedPositions: Set<string> = new Set();

  let maxLevel = 0;

  function determineLevel(block: BlockType): number {
    if (levels[block.uuid] !== undefined) {
      return levels[block.uuid];
    }
    if (block.upstream_blocks.length === 0) {
      levels[block.uuid] = 0;
    } else {
      levels[block.uuid] = Math.max(
        ...block.upstream_blocks.map((upstreamId) => {
          const upstreamBlock = blocks.find((b) => b.uuid === upstreamId);
          return upstreamBlock ? determineLevel(upstreamBlock) + 1 : 0;
        }),
      );
    }
    maxLevel = Math.max(maxLevel, levels[block.uuid]);
    return levels[block.uuid];
  }

  blocks.forEach(determineLevel);
  const isHorizontal = layoutDirection === LayoutConfigDirectionEnum.HORIZONTAL;

  const columns: Record<number, number[]> = {};
  const rows: Record<number, number[]> = {};
  for (let i = 0; i <= maxLevel; i++) {
    if (isHorizontal) {
      columns[i] = [20];
    } else {
      rows[i] = [20];
    }
  }

  function getNextAvailablePosition(level: number, index: number, parentPosition?: { left: number; top: number }): { left: number; top: number } {
    const offsetIndex = (index % 2 === 0 ? 0.1 : -0.1);
    const actualHorizontalSpacing = horizontalSpacing * (1 + offsetIndex);
    const actualVerticalSpacing = verticalSpacing * (1 + offsetIndex);

    if (layoutDirection === LayoutConfigDirectionEnum.HORIZONTAL) {
      const top = level * (blockHeight + verticalSpacing) + 20;
      let left;
      if (parentPosition) {
        left = parentPosition.left + blockWidth + actualHorizontalSpacing;
      } else {
        left = columns[level].reduce((a, b) => Math.max(a, b)) + blockWidth + actualHorizontalSpacing;
      }
      return { left, top };
    } else {
      const left = level * (blockWidth + horizontalSpacing) + 20;
      let top;
      if (parentPosition) {
        top = parentPosition.top + blockHeight + actualVerticalSpacing;
      } else {
        top = rows[level].reduce((a, b) => Math.max(a, b)) + blockHeight + actualVerticalSpacing;
      }
      return { left, top };
    }
  }

  blocks.forEach((block, idx: number) => {
    const level = levels[block.uuid];
    let position;

    if (block.upstream_blocks.length > 0) {
      const parentPosition = positions[block.upstream_blocks[0]];
      position = getNextAvailablePosition(level, idx, parentPosition);
    } else {
      position = getNextAvailablePosition(level, idx);
    }

    positions[block.uuid] = position;
    occupiedPositions.add(`${position.left},${position.top}`);

    if (layoutDirection === LayoutConfigDirectionEnum.HORIZONTAL) {
      columns[level].push(position.left);
    } else {
      rows[level].push(position.top);
    }
  });

  const { height, width } = containerRect || { height: 0, width: 0 };
  const minLeft = Math.min(...Object.values(positions).map((p) => p.left));
  const minTop = Math.min(...Object.values(positions).map((p) => p.top));
  const maxLeft = Math.max(...Object.values(positions).map((p) => p.left));
  const maxTop = Math.max(...Object.values(positions).map((p) => p.top));
  const offsetX = (width - (maxLeft - minLeft)) / 2;
  const offsetY = (height - (maxTop - minTop)) / 2;

  const blockMapping: Record<string, BlockType> = {};
  const blockUpsDownsMapping: Record<string, {
    downstream_blocks: Record<string, BlockType>,
    upstream_blocks: Record<string, BlockType>,
  }> = {};

  blocks.forEach((block: BlockType) => {
    blockMapping[block.uuid] = block;
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

      const downstreamBlock = blocks.find((b) => b.uuid === uuid);
      blockUpsDownsMapping[block.uuid].downstream_blocks ||= {};
      blockUpsDownsMapping[block.uuid].downstream_blocks[uuid] = downstreamBlock;
    });

    block?.upstream_blocks?.forEach((uuid: string) => {
      blockUpsDownsMapping[uuid] ||= {
        downstream_blocks: {},
        upstream_blocks: {},
      };
      blockUpsDownsMapping[uuid].downstream_blocks ||= {};
      blockUpsDownsMapping[uuid].downstream_blocks[block.uuid] = block;

      const upstreamBlock = blocks.find((b) => b.uuid === uuid);
      blockUpsDownsMapping[block.uuid].upstream_blocks ||= {};
      blockUpsDownsMapping[block.uuid].upstream_blocks[uuid] = upstreamBlock;
    });

    // Create item and rect
    const position = positions[block.uuid];
    itemsMapping[block.uuid] = {
      block,
      id: block.uuid,
      rect: {
        height: blockHeight,
        left: position.left + offsetX,
        top: position.top + offsetY,
        width: blockWidth,
      },
      title: block.name,
      type: ItemTypeEnum.BLOCK,
    };
  });

  const downFlowPorts = {};
  // console.log('OMGGGGGGGGGGGGGGGGGGG', blockUpsDownsMapping);
  // Create ports
  Object.entries(blockUpsDownsMapping)?.forEach(([blockUUID, map]: [string, {
    downstream_blocks: Record<string, BlockType>,
    upstream_blocks: Record<string, BlockType>,
  }]) => {
    const block = blockMapping?.[blockUUID];
    const parentItem: DragItem = itemsMapping[blockUUID];

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
          parent: update(parentItem, { block: { $set: block } }),
          subtype,
          target: update(targetItem, { block: { $set: targetBlock } }),
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

    itemsMapping[blockUUID] = update(parentItem, {
      inputs: { $set: inputs },
      outputs: { $set: outputs },
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

    // console.log('OMGGGGGGGGGGGGGGGGGGG@@@@@@@@@@@@@@', port, fromItemBlock, toItemBlock);

    // itemsMapping.inputs.target

    const fromItem = itemsMapping[fromItemBlock.uuid];
    const toItem = itemsMapping[toItemBlock.uuid];
    // console.log(fromItem, toItem, port);

    const fromPort = fromItem?.outputs?.find(p => p?.target?.block?.uuid === toItemBlock?.uuid);
    const toPort = toItem?.inputs?.find(p => p?.target?.block?.uuid === fromItemBlock?.uuid);
    // console.log(fromPort, toPort, port);

    const connection = createConnection(fromPort, toPort);
    connectionsMapping[connection.id] = connection;
  });
    // console.log('?????????????????????????????????', connectionsMapping);

  // console.log(
  //   // blockUpsDownsMapping,
  //   // itemsMapping,
  //   // downFlowPorts,
  //   // connectionsMapping,
  // );

  return {
    connectionsMapping,
    itemsMapping,
    portsMapping,
  };
}
