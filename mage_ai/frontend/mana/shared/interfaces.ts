export enum EventOperationEnum {
  DRAGGING = 'drag.active',
  DRAG_END = 'drag.end',
  DRAG_START = 'drag.start',
  DROP_START = 'drop.start',
}

export type EventControlType = {
  preventDefault?: boolean;
  preventDefaultCondition?: (event: ClientEventType) => boolean;
  stopPropagation?: boolean;
  stopPropagationCondition?: (event: ClientEventType) => boolean;
};

export type ClientEventType = {
  control?: EventControlType;
  data?: Record<string, any>;
  operationTarget?: HTMLElement;
  operationType?: EventOperationEnum;
} & Event & MouseEvent;

export type HandleOperationType = (event: ClientEventType) => boolean;

export type ClientEventCallbackType = {
  handle?: HandleOperationType;
  uuid?: number | string;
};

export interface EventStackEntryType {
  callback: ClientEventCallbackType;
  event: ClientEventType;
}
