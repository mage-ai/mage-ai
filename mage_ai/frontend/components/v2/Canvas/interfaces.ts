import BlockType from '@interfaces/BlockType';
import { PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';

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
  level?: number;
  version?: number | string;
  type: ItemTypeEnum;
}

export interface DragItem extends BaseItem {
  block?: BlockType;
  groups?: string[];
  isDragging?: boolean;
  node?: NodeType;
  ports?: PortType[];
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
  upstreamNodes?: (DragItem | NodeType)[];
}

export interface LayoutConfigType {
  boundingRect?: RectType;
  containerRect?: RectType;
  defaultRect?: {
    item?: (item?: NodeItemType) => RectType;
  };
  direction?: LayoutConfigDirectionEnum;
  level?: number;
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
  transformRect?: {
    block?: (rect?: RectType) => RectType;
    node?: (rect?: RectType) => RectType;
    port?: (rect?: RectType) => RectType;
  };
  transformState?: ZoomPanStateType;
}

export type NodeItemType = DragItem | NodeType | PortType;

export interface ConnectionType {
  curveControl?: number; // Controls the curvature of the line (0 for straight, higher for more curved)
  from: string; // ID of the source node
  fromItem?: PortType; // Reference to the source node
  fromPosition?: 'top' | 'bottom' | 'left' | 'right' | 'middle'; // Position where the connection starts
  id: string;
  level?: number;
  to: string; // ID of the destination node
  toItem?: PortType; // Reference to the destination node
  toPosition?: 'top' | 'bottom' | 'left' | 'right' | 'middle'; // Position where the connection ends
}

export type ConnectionMappingType = Record<string, ConnectionType>;
export type ItemMappingType = Record<string, DragItem | NodeItemType>;
export type NodeItemMappingType = Record<string, NodeType>;
export type PortMappingType = Record<string, PortType>;

export type BlockMappingType = Record<string, BlockType>;
export type BlocksByGroupType = Record<GroupUUIDEnum, BlockMappingType>;
export type GroupMappingType = Record<GroupUUIDEnum, PipelineExecutionFrameworkBlockType>;
export type GroupLevelsMappingType = GroupMappingType[];

export type ModelMappingType = {
  itemMapping?: ItemMappingType;
  portMapping?: PortMappingType;
};

export type ModelRefsType = {
  itemsRef?: { current: ItemMappingType };
  portsRef?: { current: PortMappingType };
};
