import React from 'react';
import { MutateType } from '@api/interfaces';
import BlockType, { TemplateType } from '@interfaces/BlockType';
import { AppNodeType, DragItem, NodeItemType, NodeType, RectType, PortType, LayoutConfigType, ModelMappingType } from '../../Canvas/interfaces';
import { ClientEventType } from '@mana/shared/interfaces';
import { AppConfigType } from '../interfaces';
import { EventOperationOptionsType } from '@mana/shared/interfaces';
import { ItemTypeEnum } from '@components/v2/Canvas/types';
import { CustomAppEventEnum } from './enums';

export type ItemElementsType = Record<ItemTypeEnum, Record<string, React.RefObject<HTMLDivElement>>>;
export type ItemElementsRefType = React.MutableRefObject<ItemElementsType>
export type SetActiveLevelType = (level?: number) => void;
export type LayoutConfigRefType = React.MutableRefObject<LayoutConfigType>;
export type ActiveLevelRefType = React.MutableRefObject<number>;
export type ItemIDsByLevelRef = React.MutableRefObject<string[][]>;

export type AppHandlerType = {
  blocks: {
    update: MutateType['update'];
  };
  executionFrameworks: MutateType;
  pipelines: MutateType;
};

export type AppHandlersRefType = React.MutableRefObject<AppHandlerType>;

export type ActiveApps = Record<string, AppNodeType[]>;
export interface AppManagerType {
  appsRef: React.MutableRefObject<ActiveApps>;
  startApp: (event: ClientEventType, app: AppConfigType) => void;
  stopApp: (event: ClientEventType, app: AppConfigType) => void;
}

export type ManagerType = AppManagerType | any;

export interface CustomAppEvent extends CustomEvent {
  detail: {
    app?: AppConfigType;
    event?: ClientEventType
    manager?: ManagerType;
    options?: {
      args?: EventOperationOptionsType['args'];
      kwargs?: EventOperationOptionsType['kwargs'];
    };
  };
}

export type SubscriptionType = {
  handler: (event: CustomAppEvent) => void;
  type: CustomAppEventEnum;
}
