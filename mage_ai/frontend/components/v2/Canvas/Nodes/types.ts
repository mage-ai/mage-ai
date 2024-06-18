import type { DragSourceMonitor, DropTargetMonitor } from 'react-dnd';

import { IconType } from '@mana/icons/types';
import { BadgeType } from '@mana/elements/Badge';
import BlockType from '@interfaces/BlockType';
import { ConnectionType, DragItem, NodeItemType, PortType } from '../interfaces';

export type DragAndDropHandlersType = {
  handlers: {
    onDragStart: (item: NodeItemType, monitor: DragSourceMonitor) => void;
    onDrop: (dragTarget: NodeItemType, dropTarget: NodeItemType) => void;
    onMouseDown: (
      event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
      obj: NodeItemType,
    ) => void;
    onMouseUp: (
      event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
      obj: NodeItemType,
    ) => void;
  };
};

export type DragAndDropType = DraggableType & DroppableType;

export type DraggableType = {
  itemRef?: React.RefObject<HTMLDivElement>;
  canDrag?: (item: DragItem) => boolean;
} & DragAndDropHandlersType['handlers'];

export type DroppableType = DragAndDropHandlersType['handlers'];

export type AsideType = {
  Icon?: IconType;
  baseColorName?: string;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
};

export type AsidesType = {
  after?: AsideType;
  before?: AsideType;
};

export type TitleConfigType = {
  asides?: AsidesType;
  badge?: BadgeType;
  inputConnection?: ConnectionType;
  label?: string;
  outputConnection?: ConnectionType;
};

type BorderType = {
  baseColorName?: string;
};

export type BorderConfigType = {
  borders?: BorderType[];
};

export type ConfigurationOptionType = {
  asides?: AsidesType;
  connecton?: ConnectionType;
  interaction?: InteractionConfigType;
  label?: string;
  value?: string;
};

export type InteractionConfigType = {
  select?: any;
  textInput?: any;
};
