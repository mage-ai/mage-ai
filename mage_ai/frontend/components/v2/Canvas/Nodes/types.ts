import { IconType } from '@mana/icons/types';
import { BadgeType } from '@mana/elements/Badge';
import { ConnectionType, DragItem, NodeItemType } from '../interfaces';

export type DragAndDropHandlersType = {
  handlers?: {
    onDragEnd?: (
      event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
      node: NodeItemType,
    ) => void;
    onDragStart?: (
      event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
      node: NodeItemType,
    ) => void;
    onDrop: (dragTarget: NodeItemType, dropTarget: NodeItemType) => void;
    onMouseDown?: (
      event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
      node: NodeItemType,
      target?: any,
    ) => boolean;
    onMouseLeave?: (
      event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
      node: NodeItemType,
      target?: any,
    ) => boolean;
    onMouseOver?: (
      event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
      node: NodeItemType,
      target?: any,
    ) => boolean;
    onMouseUp?: (
      event: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
      node: NodeItemType,
      target?: any,
    ) => boolean;
  };
};

export type DraggableType = {
  canDrag?: (item: DragItem) => boolean;
  draggingNode?: NodeItemType;
  itemRef?: React.RefObject<HTMLDivElement>;
} & DragAndDropHandlersType;

export type DroppableType = DragAndDropHandlersType;

export type DragAndDropType = DraggableType & DroppableType;

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
