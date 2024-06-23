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

export function buildPortUUID(
  item: PortType | DragItem,
  opts?: {
    fromBlock: BlockType;
    toBlock: BlockType;
  },
) {
  if (!item && opts?.fromBlock && opts?.toBlock) {
    return buildPortID(
      getBlockConnectionUUID(opts?.fromBlock),
      getBlockConnectionUUID(opts?.toBlock),
    );
  }

  if (ItemTypeEnum.PORT === item.type) {
    const port = item as PortType;

    let fromBlock;
    let toBlock;

    if (PortSubtypeEnum.OUTPUT === port.subtype) {
      fromBlock = port?.parent?.block;
      toBlock = port?.target?.block;
    } else {
      fromBlock = port?.target?.block;
      toBlock = port?.parent?.block;
    }

    if (fromBlock && toBlock) {
      return buildPortID(
        getBlockConnectionUUID(fromBlock) || 'none',
        getBlockConnectionUUID(toBlock) || 'none',
      );
    } else {
      let fromItem;
      let toItem;

      if (PortSubtypeEnum.OUTPUT === port.subtype) {
        fromItem = port?.parent;
        toItem = port?.target;
      } else {
        fromItem = port?.target;
        toItem = port?.parent;
      }

      return buildPortID(String(fromItem?.id), String(toItem?.id));
    }
  }

  return getBlockConnectionUUID(item.block);
}
