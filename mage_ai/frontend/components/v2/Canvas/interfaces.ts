import {
  ItemTypeEnum,
  PortSubtypeEnum,
  LayoutConfigDirectionEnum,
  LayoutConfigDirectionOriginEnum,
} from './types';

export interface OffsetType {
  x: number;
  y: number;
}

export interface RectType {
  height?: number;
  left: number;
  top: number;
  width?: number;
}

interface BaseItem {
  id: number | string;
  type: ItemTypeEnum;
}

export interface DragItem extends BaseItem {
  inputs?: PortType[];
  isDragging?: boolean;
  outputs?: PortType[];
  rect?: RectType;
  title?: string;
}

export interface PortType extends DragItem {
  index: number;
  parent: DragItem;
  subtype: PortSubtypeEnum;
}

export interface LayoutConfigType {
  direction: LayoutConfigDirectionEnum;
  origin: LayoutConfigDirectionOriginEnum;
}

export type NodeItemType = DragItem | PortType;
