import { DragItem, NodeItemType, PortType } from '../interfaces';
import { PortSubtypeEnum, ItemTypeEnum } from '../types';

export function buildPortID(fromUUID: string, toUUID: string) {
  return [fromUUID, toUUID].join(':');
}

export function getNodeUUID(node: NodeItemType): string {
  const { id, type } = node;
  const arr = [type, id];

  if (ItemTypeEnum.PORT === node.type) {
    const { index, subtype } = node as PortType;
    arr.push(...[subtype, index]);
  }

  return arr?.filter(t => t)?.join('-');
}
