import { ItemTypeEnum, PortSubtypeEnum } from './types';

interface BaseItem {
  id: number | string;
  type: ItemTypeEnum;
}

export interface DragItem extends BaseItem {
  height?: number;
  isDragging?: boolean;
  left?: number;
  title?: string;
  top?: number;
  width?: number;
}

export interface PortType extends DragItem {
  index: number;
  parent: DragItem;
  subtype: PortSubtypeEnum;
}

export type NodeItemType = DragItem | PortType;
