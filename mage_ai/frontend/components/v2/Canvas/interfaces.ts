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
  bottom?: number;
  diff?: RectType;
  height?: number;
  id?: number | string;
  inner?: Record<string, RectType>;
  left: number;
  offset?: OffsetType;
  padding?: RectType;
  right?: number;
  top: number;
  upstreamRects?: RectType[];
  version?: number;
  width?: number;
  zIndex?: number;
}

interface BaseItem {
  id: number | string;
  type: ItemTypeEnum;
}

export interface DragItem extends BaseItem {
  block?: BlockType;
  groups?: string[];
  inputs?: PortType[];
  isDragging?: boolean;
  node?: NodeType;
  outputs?: PortType[];
  rect?: RectType;
  title?: string;
  upstreamItems?: DragItem[];
}

export interface PortType extends DragItem {
  index?: number;
  parent: DragItem; // Always references the block that the port belongs to.
  target: DragItem; // Always references the block that the port is connected to that isn’t the current block.
  subtype: PortSubtypeEnum;
}

export interface NodeType extends DragItem {
  items: (DragItem | NodeType)[];
  ports: PortType[];
  upstreamNodes?: (DragItem | NodeType)[];
}

export interface LayoutConfigType {
  boundingRect?: RectType;
  containerRect?: RectType;
  defaultRect?: {
    item?: (item?: DragItem) => RectType;
    node?: (node?: NodeType) => RectType;
  };
  direction?: LayoutConfigDirectionEnum;
  origin?: LayoutConfigDirectionOriginEnum;
  gap?: {
    column?: number;
    row?: number;
  };
  grid?: {
    columns?: number;
    rows?: number;
  };
  itemRect?: RectType;
  stagger?: number;
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
