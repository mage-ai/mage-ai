import update from 'immutability-helper';
import BlockType from '@interfaces/BlockType';
import { DragItem, PortType, LayoutConfigType } from '../../../Canvas/interfaces';
import { buildPortID, getNodeUUID } from '../../../Canvas/Draggable/utils';
import {
  PortSubtypeEnum,
  ItemTypeEnum,
  LayoutConfigDirectionEnum,
  LayoutConfigDirectionOriginEnum,
} from '../../../Canvas/types';
import { createConnection, connectionUUID } from '../Connections/utils';
import { ConnectionType } from '../Connections/interfaces';

export function initializeBlocksAndConnections(
  blocks: BlockType[],
  opts?: {
    blockHeight?: number;
    blockWidth?: number;
    horizontalSpacing?: number;
    layout?: LayoutConfigType;
    maxHeight?: number;
    maxWidth?: number;
    verticalSpacing?: number;
  },
) {
  const {
    blockHeight = 200,
    blockWidth = 300,
    horizontalSpacing = 200,
    layout,
    maxHeight,
    maxWidth,
    verticalSpacing = 100,
  } = opts || {};

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
        ...block.upstream_blocks.map(upstreamId => {
          const upstreamBlock = blocks.find(b => b.uuid === upstreamId);
          return upstreamBlock ? determineLevel(upstreamBlock) + 1 : 0;
        }),
      );
    }
    maxLevel = Math.max(maxLevel, levels[block.uuid]);
    return levels[block.uuid];
  }

  blocks.forEach(determineLevel);

  const columns: Record<number, number[]> = {};
  for (let i = 0; i <= maxLevel; i++) {
    columns[i] = [20];
  }

  function getNextAvailablePosition(
    level: number,
    parentPosition?: { left: number; top: number },
  ): { left: number; top: number } {
    const top = level * (blockHeight + verticalSpacing) + 20;
    let left = 20;
    if (parentPosition) {
      left = parentPosition.left + blockWidth + horizontalSpacing;
    } else {
      const lastLeft = columns[level][columns[level].length - 1];
      left = lastLeft + blockWidth + horizontalSpacing;
    }
    return { left, top };
  }

  blocks.forEach(block => {
    const level = levels[block.uuid];
    const top = level * (blockHeight + verticalSpacing) + 20;
    let left: number;

    if (block.upstream_blocks.length > 0) {
      const parentPosition = positions[block.upstream_blocks[0]];
      const position = getNextAvailablePosition(level, parentPosition);
      left = position.left;
    } else {
      const position = getNextAvailablePosition(level);
      left = position.left;
    }

    positions[block.uuid] = { left, top };
    occupiedPositions.add(`${left},${top}`);
    columns[level].push(left);
  });

  blocks.forEach(block => {
    const position = positions[block.uuid];
    itemsMapping[block.uuid] = {
      id: block.uuid,
      rect: {
        height: blockHeight,
        left: position.left,
        top: position.top,
        width: blockWidth,
      },
      title: block.name,
      type: ItemTypeEnum.BLOCK,
    };
  });

  blocks?.forEach(block => {
    const item: DragItem = itemsMapping[block?.uuid];
    const inputs: PortType[] = [];
    const outputs: PortType[] = [];

    Object.entries({
      [PortSubtypeEnum.INPUT]: block.upstream_blocks,
      [PortSubtypeEnum.OUTPUT]: block.downstream_blocks,
    }).forEach(([subtype, uuids]: [PortSubtypeEnum, string[]]) => {
      uuids?.forEach((uuid: string, idx: number) => {
        const port: PortType = {
          id: buildPortID(block?.uuid, uuid),
          index: idx,
          // Parent is the wrong word; it’s suppose to mean the associated item.
          // If the port is an input, then the parent is the upstream block.
          parent: item,
          subtype,
          type: ItemTypeEnum.PORT,
        };
        // console.log(subtype, port);
        portsMapping[getNodeUUID(port)] = port;

        if (PortSubtypeEnum.INPUT === port?.subtype) {
          inputs.push(port);
        } else if (PortSubtypeEnum.OUTPUT === port?.subtype) {
          outputs.push(port);
        }
      });
    });

    itemsMapping[block.uuid] = update(item, {
      inputs: { $set: inputs },
      outputs: { $set: outputs },
    });
  });

  blocks.forEach(block => {
    const fromItem = itemsMapping[block.uuid];
    // Downstream blocks
    block?.downstream_blocks?.forEach((uuidDn: string) => {
      const toItem = itemsMapping[uuidDn] as DragItem;
      const fromPort = (fromItem?.outputs as PortType[])?.find(
        port => port.id === buildPortID(block?.uuid, uuidDn),
      );
      const toPort = (toItem?.inputs as PortType[])?.find(
        port => port.id === buildPortID(uuidDn, block.uuid),
      );

      if (fromPort && toPort) {
        const connection = createConnection(fromPort, toPort);
        if (connection) {
          connectionsMapping[connectionUUID(connection)] = connection;
        }
      }
    });
  });

  // console.log('items', Object.values(itemsMapping || {})?.length);
  // console.log('ports', Object.values(portsMapping || {})?.length);
  // console.log('connections', Object.values(connectionsMapping || {})?.length);
  // console.log(connectionsMapping);

  return {
    connectionsMapping,
    itemsMapping,
    portsMapping,
  };
}
