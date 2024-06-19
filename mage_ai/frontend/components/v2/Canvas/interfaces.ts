import BlockType from '@interfaces/BlockType';

import {
  ItemTypeEnum,
  PortSubtypeEnum,
  LayoutConfigDirectionEnum,
  LayoutConfigDirectionOriginEnum,
} from './types';

export interface OffsetType {
  left?: number;
  top?: number;
  x?: number;
  y?: number;
}

export interface RectType {
  diff?: RectType;
  id?: string;
  offset?: OffsetType;
  height?: number;
  left: number;
  top: number;
  version?: number;
  width?: number;
}

interface BaseItem {
  id: number | string;
  type: ItemTypeEnum;
}

export interface DragItem extends BaseItem {
  block?: BlockType;
  inputs?: PortType[];
  isDragging?: boolean;
  outputs?: PortType[];
  rect?: RectType;
  title?: string;
}

export interface PortType extends DragItem {
  index?: number;
  parent: DragItem; // Always references the block that the port belongs to.
  target: DragItem; // Always references the block that the port is connected to that isn’t the current block.
  subtype: PortSubtypeEnum;
}

export interface LayoutConfigType {
  direction: LayoutConfigDirectionEnum;
  origin: LayoutConfigDirectionOriginEnum;
}

export type NodeItemType = DragItem | PortType;

export interface ConnectionType {
  curveControl?: number; // Controls the curvature of the line (0 for straight, higher for more curved)
  from: string; // ID of the source node
  fromItem?: PortType; // Reference to the source node
  fromPosition?: 'top' | 'bottom' | 'left' | 'right' | 'middle'; // Position where the connection starts
  id: string;
  to: string; // ID of the destination node
  toItem?: PortType; // Reference to the destination node
  toPosition?: 'top' | 'bottom' | 'left' | 'right' | 'middle'; // Position where the connection ends
}
