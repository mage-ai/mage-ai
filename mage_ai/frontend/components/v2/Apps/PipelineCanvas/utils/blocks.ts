import update from 'immutability-helper';
import BlockType from '@interfaces/BlockType';
import { DragItem, PortType, LayoutConfigType, RectType } from '../../../Canvas/interfaces';
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
    containerRect?: RectType
    verticalSpacing?: number;
  },
) {
  const {
    blockHeight = 10,
    blockWidth = 200,
    horizontalSpacing = 300,
    layout,
    containerRect,
    verticalSpacing = 10,
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

  const columns: Record<number, number[]> = {};
  const rows: Record<number, number[]> = {};
  for (let i = 0; i <= maxLevel; i++) {
    if (layoutDirection === LayoutConfigDirectionEnum.HORIZONTAL) {
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

  blocks.forEach((block: BlockType) => {
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

  blocks?.forEach((block) => {
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
          parent: item,
          subtype,
          type: ItemTypeEnum.PORT,
        };
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

  blocks.forEach((block) => {
    const fromItem = itemsMapping[block.uuid];
    block?.downstream_blocks?.forEach((uuidDn: string) => {
      const toItem = itemsMapping[uuidDn] as DragItem;
      const fromPort = (fromItem?.outputs as PortType[])?.find(
        (port) => port.id === buildPortID(block?.uuid, uuidDn),
      );
      const toPort = (toItem?.inputs as PortType[])?.find(
        (port) => port.id === buildPortID(uuidDn, block.uuid),
      );

      if (fromPort && toPort) {
        const connection = createConnection(fromPort, toPort);
        if (connection) {
          connectionsMapping[connectionUUID(connection)] = connection;
        }
      }
    });
  });

  return {
    connectionsMapping,
    itemsMapping,
    portsMapping,
  };
}
