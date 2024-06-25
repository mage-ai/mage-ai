export type UpdateBlockRequestType = (
  event: any | Event,
  key: string,
  value: any,
  opts?: {
    callback?: () => void;
    delay?: number;
  },
) => void;
export type SharedBlockProps = {
  block?: any;
  updateBlock: UpdateBlockRequestType;
};

export type DragAndDropHandlersType = {
  handlers?: {
    onDragEnd?: (event: any) => void;
    onDragStart?: (event: any) => void;
    onDrop: (dragTarget: any, dropTarget: any) => void;
    onMouseDown?: (event: any) => void;
    onMouseLeave?: (event: any) => void;
    onMouseOver?: (event: any) => void;
    onMouseUp?: (event: any) => void;
  };
};

export type DraggableType = {
  canDrag?: (item: any) => boolean;
  connectDrag?: (dragRef: React.MutableRefObject<HTMLDivElement>) => void;
  draggable?: boolean;
  draggingNode?: any;
  nodeRef?: React.RefObject<HTMLDivElement>;
} & any;

export type DroppableType = {
  droppable?: boolean;
} & any;

export type DragAndDropType = any & any;

export type AsideType = {
  Icon?: any;
  baseColorName?: string;
  borderColor?: string;
  buttonRef: React.RefObject<HTMLDivElement>;
  className?: string;
  loading?: boolean;
  menuItems?: any[];
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  uuid?: string;
};

export type AsidesType = {
  after?: AsideType;
  before?: AsideType;
};

export type TitleConfigType = {
  asides?: any;
  badge?: any;
  inputConnection?: any;
  label?: string;
  outputConnection?: any;
};

type BorderType = {
  baseColorName?: string;
};

export type BorderConfigType = {
  borders?: BorderType[];
};

export type ConfigurationOptionType = {
  asides?: any;
  connecton?: any;
  interaction?: any;
  label?: string;
  value?: string;
};

export type InteractionConfigType = {
  select?: any;
  textInput?: any;
};

export type BlockNodeWrapperProps = {
  Wrapper?: React.FC<any>;
  appHandlersRef: React.MutableRefObject<any>;
  loading?: boolean;
  models?: {
    blocksByGroup: React.RefObject<any>;
  };
  onMountPort?: (port: any, portRef: React.RefObject<HTMLDivElement>) => void;
  selected?: boolean;
  submitEventOperation: any;
  useExecuteCode: any;
  useRegistration: any;
  version?: number | string;
} & any &
  any &
  any;

export type SharedWrapperProps = any & any;
