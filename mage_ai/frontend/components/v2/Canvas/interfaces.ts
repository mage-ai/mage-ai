import BlockType from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';
import { FrameworkType, PipelineExecutionFrameworkBlockType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { GroupUUIDEnum } from '@interfaces/PipelineExecutionFramework/types';
import { RectTransformationScopeEnum, TransformRectTypeEnum } from './types';
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
  children?: RectType[];
  diff?: RectType;
  height?: number;
  id?: number | string;
  inner?: Record<string, RectType>;
  left: number;
  offset?: OffsetType;
  padding?: RectType;
  parent?: RectType;
  right?: number;
  top: number;
  upstream?: RectType[];
  version?: number;
  width?: number;
  zIndex?: number;
}

interface BaseItem {
  id: number | string;
  level?: number;
  version?: number;
  type: ItemTypeEnum;
}

export interface DragItem extends BaseItem {
  block?: BlockType & {
    frameworks: FrameworkType[];
  } & FrameworkType;
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
  downstream?: string[];
  items: (DragItem | NodeType | string)[];
  node?: NodeType;
  upstream?: string[];
}

export interface RectTransformationOptionsType {
  boundingBox?: RectType;
  layout?: LayoutConfigType;
  layoutOptions?: {
    // Wave layout options
    amplitude?: number;
    wavelength?: number;
    // Spiral layout options
    angleStep: number; // Smaller angle increment for tighter spiral
    initialAngle: number; // 45 degrees in radians
  };
  offset?: RectType;
  padding?: RectType;
  rect?: RectType;
}

export interface RectTransformationType {
  condition?: (rects: RectType[]) => boolean;
  initialScope?: RectTransformationScopeEnum;
  options?: (rects: RectType[]) => RectTransformationOptionsType;
  scope?: RectTransformationScopeEnum; // Leave empty to operate on all rects at the top level
  scopeTransformations?: RectTransformationType[];
  targets?: (rects: RectType[]) => RectType[];
  transform?: (rects: RectType[]) => RectType[];
  type?: TransformRectTypeEnum;
}

export interface LayoutConfigType {
  containerRef?: React.MutableRefObject<HTMLElement>;
  defaultRect?: {
    item?: (item?: NodeItemType) => RectType;
  };
  direction?: LayoutConfigDirectionEnum;
  level?: number;
  offsetRectFinal?: RectType;
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
  rectTransformations?: RectTransformationType[];
  stagger?: number;
  transformRect?: {
    block?: (rect?: RectType) => RectType;
    node?: (rect?: RectType) => RectType;
    port?: (rect?: RectType) => RectType;
  };
  transformStateRef?: React.MutableRefObject<ZoomPanStateType>;
  viewportRef?: React.MutableRefObject<HTMLElement>;
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
export type GroupMappingType = Record<GroupUUIDEnum, FrameworkType>;
export type GroupLevelsMappingType = GroupMappingType[];

export type GroupLevelType = FrameworkType[][];

export type BlockGroupType = {
  blocks: BlockType[];
  group: FrameworkType;
};

export type ModelMappingType = {
  itemMapping?: ItemMappingType;
  portMapping?: PortMappingType;
};

export type ModelRefsType = {
  itemsRef?: { current: ItemMappingType };
  portsRef?: { current: PortMappingType };
};
