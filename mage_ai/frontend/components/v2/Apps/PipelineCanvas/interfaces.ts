import React from 'react';
import { MenuItemType, RenderContextMenuOptions, RemoveContextMenuType, RenderContextMenuType } from '@mana/hooks/useContextMenu';
import type { DropTargetMonitor, XYCoord } from 'react-dnd';
import PipelineExecutionFrameworkType, { ConfigurationType, FrameworkType } from '@interfaces/PipelineExecutionFramework/interfaces';
import { MutateType } from '@api/interfaces';
import BlockType, { TemplateType } from '@interfaces/BlockType';
import {
  AppNodeType, DragItem, NodeItemType, NodeType, RectType, PortType, LayoutConfigType,
  PortMappingType, ItemMappingType, BlocksByGroupType, ModelMappingType, GroupLevelType,
  BlockMappingType,
  GroupMappingType
} from '../../Canvas/interfaces';
import { ClientEventType } from '@mana/shared/interfaces';
import { AppConfigType } from '../interfaces';
import { EventOperationOptionsType } from '@mana/shared/interfaces';
import { ItemTypeEnum } from '@components/v2/Canvas/types';
import { CustomAppEventEnum } from './enums';
import { MenuGroupType } from '@mana/components/Menu/interfaces';

export type ItemElementsType = Record<ItemTypeEnum, Record<string, React.RefObject<HTMLDivElement | HTMLElement>>>;
export type ItemElementsRefType = React.MutableRefObject<ItemElementsType>
export type SetActiveLevelType = (level?: number) => void;
export type LayoutConfigRefType = React.MutableRefObject<LayoutConfigType>;
export type ActiveLevelRefType = React.MutableRefObject<number>;
export type ItemIDsByLevelRef = React.MutableRefObject<string[][]>;

export type AppHandlerType = {
  blocks: {
    update: MutateType['update'];
  };
  browserItems: MutateType;
  executionFrameworks: MutateType;
  pipelines: MutateType;
};

export type AppHandlersRefType = React.MutableRefObject<AppHandlerType>;

export type ActiveApps = Record<string, AppNodeType[]>;

export type LayoutConfigRef = React.MutableRefObject<LayoutConfigType>;

export interface AppManagerType {
  appsRef: React.MutableRefObject<ActiveApps>;
  startApp: (event: ClientEventType, app: AppConfigType) => void;
  stopApp: (event: ClientEventType, app: AppConfigType) => void;
}

export interface ModelManagerType {
  activeLevel: React.MutableRefObject<number>;
  blockMappingRef: React.MutableRefObject<BlockMappingType>;
  groupMappingRef: React.MutableRefObject<GroupMappingType>;
  appHandlersRef: AppHandlersRefType;
  blocksByGroupRef: React.MutableRefObject<BlocksByGroupType>;
  executionFramework: PipelineExecutionFrameworkType;
  groupsByLevelRef: React.MutableRefObject<GroupLevelType>;
  itemsRef: React.MutableRefObject<ItemMappingType>;
  mutateModels: (payload?: ModelMappingType) => ModelMappingType;
  onItemChangeRef: React.MutableRefObject<(payload: NodeItemType) => void>;
  onModelChangeRef: React.MutableRefObject<(payload: PipelineExecutionFrameworkType) => void>;
  pipeline: PipelineExecutionFrameworkType;
  portsRef: React.MutableRefObject<PortMappingType>;
  updateNodeItems: (items: ItemMappingType) => void;
  updatePorts: (ports: PortMappingType) => void;
}

export interface EventManagerType {
  gridDimensions: React.MutableRefObject<RectType>;
  handleContextMenu: RenderContextMenuType;
  handleDoubleClick: (event: React.MouseEvent) => void;
  handleDragEnd: (event: ClientEventType) => void;
  handleDragStart: (event: ClientEventType) => void;
  handleMouseDown: (event: ClientEventType) => void;
  onDragInit: (node: NodeItemType, monitor: DropTargetMonitor) => void;
  onDragging: (args: {
    clientOffset: XYCoord;
    currentOffset: XYCoord;
    differenceFromInitialOffset: XYCoord;
    initialClientOffset: XYCoord;
    initialOffset: XYCoord;
    itemType: ItemTypeEnum;
    item: NodeItemType;
  }) => void;
  onDropBlock: (item: NodeItemType, monitor: DropTargetMonitor) => void;
  onDropPort: (dragTarget: NodeItemType, dropTarget: NodeItemType) => void;
  resetAfterDrop: () => void;
  setSnapToGridOnDrag: (value: boolean) => void;
  setSnapToGridOnDrop: (value: boolean) => void;
  snapToGridOnDrag: boolean;
  snapToGridOnDrop: boolean;
  submitEventOperation: (event: ClientEventType, opts?: EventOperationOptionsType) => void;
}

export type LayoutManagerType = {
  itemElementsRef: React.MutableRefObject<ItemElementsType>
};

export type ItemManagerType = {
  itemMetadataRef: React.MutableRefObject<Record<string, Record<string, any>>>;
};

export interface SettingsManagerType {
  activeLevel: React.MutableRefObject<number>;
  layoutConfigs: React.MutableRefObject<LayoutConfigRef[]>;
  selectedGroupsRef: React.MutableRefObject<MenuGroupType[]>;
}

export type SubscriberType = AppManagerType & EventManagerType & LayoutManagerType
  & ModelManagerType & NodeItemType & ItemManagerType & SettingsManagerType;

export interface CustomEventDetail {
  app?: AppConfigType;
  block?: BlockType;
  event?: ClientEventType
  item?: NodeItemType;
  manager?: SubscriberType;
  node?: NodeItemType;
  nodes?: NodeItemType[];
  options?: {
    args?: EventOperationOptionsType['args'];
    kwargs?: EventOperationOptionsType['kwargs'];
  };
}
export interface CustomAppEvent extends CustomEvent {
  detail: CustomEventDetail;
}

export type SubscriptionType = {
  handler: (event: CustomAppEvent) => void;
  type: CustomAppEventEnum;
}
