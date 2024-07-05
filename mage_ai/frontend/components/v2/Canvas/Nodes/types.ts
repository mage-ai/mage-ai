import BlockType from '@interfaces/BlockType';
import { NodeWrapperProps } from './NodeWrapper';
import { IconType } from '@mana/icons/types';
import { BadgeType } from '@mana/elements/Badge';
import { PortType, ConnectionType, DragItem, NodeItemType, LayoutConfigType } from '../interfaces';
import { BlockNode, CanvasNodeType } from './interfaces';
import { ClientEventType, SubmitEventOperationType } from '@mana/shared/interfaces';
import { ExecutionManagerType } from '../../ExecutionManager/interfaces';
import { MenuItemType } from '@mana/components/Menu/interfaces';

export type UpdateBlockRequestType = (event: ClientEventType | Event, key: string, value: any, opts?: {
  delay?: number;
}) => void;
export type SharedBlockProps = {
  block?: BlockType;
  updateBlock: UpdateBlockRequestType;
};

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
  nodeRef?: React.RefObject<HTMLDivElement>;
} & DragAndDropHandlersType;

export type DroppableType = {
  droppable?: boolean;
} & DragAndDropHandlersType;

export type DragAndDropType = DraggableType & DroppableType;

export type AsideType = {
  Icon?: IconType;
  baseColorName?: string;
  buttonRef: React.RefObject<HTMLDivElement>;
  className?: string;
  menuItems: MenuItemType[];
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  uuid?: string;
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

export type BlockNodeWrapperProps = {
  Wrapper?: React.FC<NodeWrapperProps>;
  loading?: boolean;
  submitEventOperation: SubmitEventOperationType;
  selected?: boolean;
  version?: number | string;
  useExecuteCode: ExecutionManagerType['useExecuteCode'];
  appHandlersRef: React.MutableRefObject<any>,
  onMountPort?: (port: PortType, portRef: React.RefObject<HTMLDivElement>) => void;
  useRegistration: ExecutionManagerType['useRegistration'];
} & NodeWrapperProps & CanvasNodeType & BlockNode;

export type SharedWrapperProps = BlockNodeWrapperProps & NodeWrapperProps;
