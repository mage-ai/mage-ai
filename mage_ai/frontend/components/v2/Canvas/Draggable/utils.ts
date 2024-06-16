import { DragItem, NodeItemType, PortType } from '../interfaces';
import { PortSubtypeEnum, ItemTypeEnum } from '../types';

export function getNodeUUID(node: NodeItemType): string {
  const { id, type } = node;

  if (ItemTypeEnum.PORT === node.type) {
    const { index, subtype } = node as PortType;
    return `${type}-${subtype}-${index}-${id}`;
  }

  return `${type}--${id}`;
}
