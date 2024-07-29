import { RectType as RectTypeBase } from '@mana/shared/interfaces';

export enum VisibleBlocksEnum {
  ALL_ANY_LEVEL = 'all_any_level',
  CHILDREN_OF_SELECTED_GROUP = 'children_of_selected_group',
  WITHOUT_GROUPS = 'without_groups',
}

export interface OffsetType {
  left?: any;
  top?: any;
  x?: any;
  y?: any;
}

export interface RectType extends RectTypeBase {
  animate?: any;
  block?: any;
  children?: any[];
  diff?: any;
  inner?: Record<string, any>;
  offset?: any;
  padding?: any;
  parent?: any;
  type?: any;
  version?: any;
}

interface BaseItem {
  id: any;
  index?: any;
  level?: any;
  status?: any;
  subtype?: any;
  type: any;
  version?: any;
}

export interface OutputNodeType extends DragItem {
  eventStreams?: Record<string, Record<string, any>>;
  process?: any | { message: any; message_request_uuid: any };
}

export interface DragItem extends BaseItem {
  block?: any & {
    frameworks: any[];
  } & any;
  downstream?: any[];
  groups?: any[];
  isDragging?: any;
  node?: any;
  outputs?: any[];
  ports?: any[];
  rect?: any;
  title?: any;
  upstream?: any[];
  upstreamItems?: any[];
}

export interface PortType extends DragItem {
  index?: any;
  parent: any; // Always references the block that the port belongs to.
  target: any; // Always references the block that the port is connected to that isn’t the current block.
}

export interface AppNodeType extends DragItem {
  app: any;
  ref?: React.MutableRefObject<any>;
}

export interface NodeType extends DragItem {
  apps?: any[];
  items?: (any | any | any)[];
  node?: any;
}

export type NodeItemType = any | any | any | any | any;
export type FlatItemType = [any, any, any, any, any];

interface LayoutOptionsType {
  amplitude?: any; // Wave layout options
  angleStep?: any; // Smaller angle increment for tighter spiral (Spiral layout options)
  horizontalAlignment?: any;
  initialAngle?: any; // 45 degrees in radians (Spiral layout options)
  stagger?: any; // Stagger between each item
  verticalAlignment?: any;
  wavelength?: any; // Wave layout options
}

export interface RectTransformationOptionsType {
  boundingBox?: any;
  defaultRect?: (rect: any) => any;
  layout?: any;
  layoutOptions?: any;
  offset?: any;
  padding?: any;
  rect?: any;
  rectTransformations?: any[];
}

export interface RectTransformationType {
  condition?: (rects: any[]) => any;
  conditionSelf?: (rect: any) => any;
  initialRect?: any;
  initialScope?: any;
  options?: (rects: any[]) => any;
  scope?: any; // Leave empty to operate on all rects at the top level
  scopeTransformations?: any[];
  targets?: (rects: any[]) => any[];
  transform?: (rects: any[]) => any[];
  type?: any;
}

export interface LayoutConfigType {
  blockLayout?: LayoutConfigType;
  blocksAndGroupsLayout?: LayoutConfigType;
  childrenLayout?: any;
  containerRef?: React.MutableRefObject<any>;
  defaultRect?: {
    item?: (item?: any) => any;
  };
  display?: any;
  direction?: any;
  level?: any;
  offsetRectFinal?: any;
  options?: any;
  origin?: any;
  gap?: {
    column?: any;
    row?: any;
  };
  grid?: {
    columns?: any;
    rows?: any;
  };
  itemRect?: any;
  rectTransformations?: any[];
  stagger?: any;
  style?: any;
  styleOptions?: any;
  transformRect?: {
    block?: (rect?: any) => any;
    node?: (rect?: any) => any;
    port?: (rect?: any) => any;
  };
  transformStateRef?: React.MutableRefObject<any>;
  viewportRef?: React.MutableRefObject<any>;
  visibleBlocks?: VisibleBlocksEnum[];
}

export interface ConnectionType {
  curveControl?: any; // Controls the curvature of the line (0 for straight, higher for more curved)
  from: any; // ID of the source node
  fromItem?: any; // Reference to the source node
  fromPosition?: any; // Position where the connection starts
  id: any;
  level?: any;
  to: any; // ID of the destination node
  toItem?: any; // Reference to the destination node
  toPosition?: any; // Position where the connection ends
}

export type ConnectionMappingType = Record<any, any>;
export type ItemMappingType = Record<any, any>;
export type NodeItemMappingType = Record<any, any>;
export type PortMappingType = Record<any, any>;

export type BlockMappingType = Record<any, any>;
export type OutputMappingType = Record<any, any>;
export type BlocksByGroupType = Record<any, any>;
export type GroupMappingType = Record<any, any>;
export type GroupLevelsMappingType = any[];

export type GroupLevelType = any[][];

export type BlockGroupType = {
  blocks: any[];
  group: any;
};

export type ModelMappingType = {
  itemMapping?: any;
  portMapping?: any;
};

export type ModelRefsType = {
  itemsRef?: { current: any };
  portsRef?: { current: any };
};
