import React from 'react';
import { DragItem, NodeItemType, NodeType, RectType, PortType, LayoutConfigType, ModelMappingType } from '../../Canvas/interfaces';

export type SetActiveLevelType = (level?: number) => void;
export type LayoutConfigRefType = React.MutableRefObject<LayoutConfigType>;
export type ActiveLevelRefType = React.MutableRefObject<number>;
export type ItemIDsByLevelRef = React.MutableRefObject<string[][]>;
