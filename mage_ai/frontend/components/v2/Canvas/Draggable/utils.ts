import BlockType from '@interfaces/BlockType';
import { DragItem, NodeItemType, PortType } from '../interfaces';
import { PortSubtypeEnum, ItemTypeEnum } from '../types';

export function buildPortID(fromUUID: string, toUUID: string) {
  return [fromUUID, toUUID].join('-');
}

export function getBlockConnectionUUID(block: BlockType) {
  return [
    block?.uuid,
    block?.type,
    block?.language,
    String(block?.upstream_blocks?.length || 0),
    String(block?.downstream_blocks?.length || 0),
  ]
    .filter(s => s)
    .join('-');
}

export function buildPortIDFromBlockToBlock(fromBlock: BlockType, toBlock: BlockType) {
  return buildPortID(getBlockConnectionUUID(fromBlock), getBlockConnectionUUID(toBlock));
}
