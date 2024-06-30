import React from 'react';
import { MutateType } from '@api/interfaces';
import BlockType, { TemplateType } from '@interfaces/BlockType';
import { DragItem, NodeItemType, NodeType, RectType, PortType, LayoutConfigType, ModelMappingType } from '../../Canvas/interfaces';
import { ClientEventType } from '@mana/shared/interfaces';
import { ItemTypeEnum } from '@components/v2/Canvas/types';

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
