import React from 'react';
import EventStreamType from '@interfaces/EventStreamType';
import {
  MenuItemType,
  RenderContextMenuOptions,
  RemoveContextMenuType,
  RenderContextMenuType,
} from '@mana/hooks/useContextMenu';
import type { DropTargetMonitor, XYCoord } from 'react-dnd';
import PipelineExecutionFrameworkType, {
  ConfigurationType,
  FrameworkType,
} from '@interfaces/PipelineExecutionFramework/interfaces';
import { MutateType } from '@api/interfaces';
import BlockType, { TemplateType } from '@interfaces/BlockType';
import {
  AppNodeType,
  DragItem,
  NodeItemType,
  NodeType,
  RectType,
  PortType,
  LayoutConfigType,
  PortMappingType,
  ItemMappingType,
  BlocksByGroupType,
  ModelMappingType,
  GroupLevelType,
  BlockMappingType,
  OutputMappingType,
  GroupMappingType,
  OutputNodeType,
} from '../../Canvas/interfaces';
import { ClientEventType } from '@mana/shared/interfaces';
import { AppConfigType } from '../interfaces';
import { EventOperationOptionsType } from '@mana/shared/interfaces';
import { ItemTypeEnum } from '@components/v2/Canvas/types';
import { CustomAppEventEnum } from './enums';
import { MenuGroupType } from '@mana/components/Menu/interfaces';

export type ItemElementsType = Record<
  any,
  Record<string, React.RefObject<HTMLDivElement | HTMLElement>>
>;
export type ItemElementsRefType = React.MutableRefObject<ItemElementsType>;
export type SetActiveLevelType = (level?: number) => void;
export type LayoutConfigRefType = React.MutableRefObject<any>;
export type ActiveLevelRefType = React.MutableRefObject<number>;
export type ItemIDsByLevelRef = React.MutableRefObject<string[][]>;

export type AppHandlerType = {
  blocks: {
    update: any['update'];
  };
  browserItems: any;
  executionFrameworks: any;
  pipelines: any;
};

export type AppHandlersRefType = React.MutableRefObject<AppHandlerType>;

export type ActiveApps = Record<string, any[]>;

export type LayoutConfigRef = React.MutableRefObject<any>;

export interface AppManagerType {
  appsRef: React.MutableRefObject<ActiveApps>;
  startApp: (event: any, app: AppConfigType) => void;
  stopApp: (event: any, app: AppConfigType) => void;
}

export interface ModelManagerType {
  activeLevel: React.MutableRefObject<number>;
  blockMappingRef: React.MutableRefObject<any>;
  groupMappingRef: React.MutableRefObject<any>;
  appHandlersRef: AppHandlersRefType;
  blocksByGroupRef: React.MutableRefObject<any>;
  executionFramework: any;
  groupsByLevelRef: React.MutableRefObject<any>;
  itemsRef: React.MutableRefObject<any>;
  mutateModels: (payload?: any) => any;
  onItemChangeRef: React.MutableRefObject<(payload: any) => void>;
  onModelChangeRef: React.MutableRefObject<(payload: any) => void>;
  outputsRef?: React.MutableRefObject<any>;
  pipeline: any;
  portsRef: React.MutableRefObject<any>;
  updateNodeItems: (items: any) => void;
  updatePorts: (ports: any) => void;
}

export interface EventManagerType {
  gridDimensions: React.MutableRefObject<any>;
  handleContextMenu: any;
  handleDoubleClick: (event: React.MouseEvent) => void;
  handleDragEnd: (event: any) => void;
  handleDragStart: (event: any) => void;
  handleMouseDown: (event: any) => void;
  onDragInit: (node: any, monitor: DropTargetMonitor) => void;
  onDragging: (args: {
    clientOffset: XYCoord;
    currentOffset: XYCoord;
    differenceFromInitialOffset: XYCoord;
    initialClientOffset: XYCoord;
    initialOffset: XYCoord;
    itemType: any;
    item: any;
  }) => void;
  onDropBlock: (item: any, monitor: DropTargetMonitor) => void;
  onDropPort: (dragTarget: any, dropTarget: any) => void;
  resetAfterDrop: () => void;
  setSnapToGridOnDrag: (value: boolean) => void;
  setSnapToGridOnDrop: (value: boolean) => void;
  snapToGridOnDrag: boolean;
  snapToGridOnDrop: boolean;
  submitEventOperation: (event: any, opts?: any) => void;
}

export type LayoutManagerType = {
  itemElementsRef: React.MutableRefObject<ItemElementsType>;
};

export type ItemManagerType = {
  itemMetadataRef: React.MutableRefObject<Record<string, Record<string, any>>>;
};

export interface SettingsManagerType {
  activeLevel: React.MutableRefObject<number>;
  controls: any;
  layoutConfigs: React.MutableRefObject<any[]>;
  selectedGroupsRef: React.MutableRefObject<MenuGroupType[]>;
}

export type SubscriberType = AppManagerType &
  EventManagerType &
  LayoutManagerType &
  ModelManagerType &
  NodeItemType &
  ItemManagerType &
  SettingsManagerType;

export interface CustomEventDetail {
  app?: AppConfigType;
  block?: BlockType;
  event?: any;
  eventStreams?: Record<string, Record<string, EventStreamType>>;
  item?: any;
  manager?: SubscriberType;
  node?: any;
  nodes?: any[];
  nodesUpdated?: any[];
  options?: {
    args?: any['args'];
    kwargs?: any['kwargs'];
  };
  output?: any;
}
export interface CustomAppEvent extends CustomEvent {
  detail: CustomEventDetail;
}

export type SubscriptionType = {
  handler: (event: CustomAppEvent) => void;
  type: CustomAppEventEnum;
};

export type ShowNodeType = (
  nodeOps: Record<string, any>,
  mountRef: React.MutableRefObject<HTMLDivElement>,
  render: (
    nodeItem: OutputNodeType | AppNodeType,
    wrapperRef: React.MutableRefObject<HTMLDivElement>,
    opts?: {
      onMount?: () => void,
      rect?: RectType;
    },
  ) => void,
  remove: (callback?: () => void) => void,
  setOnRemove: (onRemove: () => void) => void,
  opts?: {
    dragControls?: any;
  },
) => void;
