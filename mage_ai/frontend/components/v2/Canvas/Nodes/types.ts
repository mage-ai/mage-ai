import { IconType } from '@mana/icons/types';
import { BadgeType } from '@mana/elements/Badge';
import { ConnectionType, DragItem, NodeItemType } from '../interfaces';
import { ClientEventType } from '@mana/shared/interfaces';

export type DragAndDropHandlersType = {
  handlers?: {
    onDragEnd?: (event: ClientEventType) => void;
    onDragStart?: (event: ClientEventType) => void;
    onDrop: (dragTarget: NodeItemType, dropTarget: NodeItemType) => void;
    onMouseDown?: (event: ClientEventType) => void;
    onMouseLeave?: (event: ClientEventType) => void;
    onMouseOver?: (event: ClientEventType) => void;
    onMouseUp?: (event: ClientEventType) => void;
  };
};

export type DraggableType = {
  canDrag?: (item: DragItem) => boolean;
  draggable?: boolean;
  draggingNode?: NodeItemType;
  itemRef?: React.RefObject<HTMLDivElement>;
} & DragAndDropHandlersType;

export type DroppableType = {
  droppable?: boolean;
} & DragAndDropHandlersType;

export type DragAndDropType = DraggableType & DroppableType;

export type AsideType = {
  Icon?: IconType;
  baseColorName?: string;
  className?: string;
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
