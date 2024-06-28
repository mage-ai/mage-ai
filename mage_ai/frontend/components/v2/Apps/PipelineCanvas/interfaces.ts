import React from 'react';
import { MutateType } from '@api/interfaces';
import { TemplateType } from '@interfaces/BlockType';
import { DragItem, NodeItemType, NodeType, RectType, PortType, LayoutConfigType, ModelMappingType } from '../../Canvas/interfaces';
import { ClientEventType } from '@mana/shared/interfaces';

export type SetActiveLevelType = (level?: number) => void;
export type LayoutConfigRefType = React.MutableRefObject<LayoutConfigType>;
export type ActiveLevelRefType = React.MutableRefObject<number>;
export type ItemIDsByLevelRef = React.MutableRefObject<string[][]>;

export type AppHandlerType = {
  executionFrameworks: MutateType;
  pipelines: MutateType;
};

export type AppHandlersRefType = React.MutableRefObject<AppHandlerType>;
