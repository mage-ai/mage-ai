import React from 'react';
import { ButtonEnum, LanguageEnum } from './enums';

export enum EventOperationEnum {
  CONTEXT_MENU_OPEN = 'context_menu.open',
  DRAGGING = 'drag.active',
  DRAG_END = 'drag.end',
  DRAG_START = 'drag.start',
  DROP_START = 'drop.start',
  MOUSE_DOWN = 'mouse.down',
}

export type EventControlType = {
  preventDefault?: boolean;
  preventDefaultCondition?: (event: ClientEventType) => boolean;
  stopPropagation?: boolean;
  stopPropagationCondition?: (event: ClientEventType) => boolean;
};

export type ClientEventType = {
  button?: ButtonEnum;
  control?: EventControlType;
  data?: Record<string, any>;
  operationTarget?: HTMLElement;
  operationType?: EventOperationEnum;
} & Event &
  MouseEvent &
  TouchEvent &
  KeyboardEvent &
  React.MouseEvent &
  React.TouchEvent;

export type HandleOperationType = (event: ClientEventType) => boolean;

export type ClientEventCallbackType = {
  handle?: HandleOperationType;
  uuid?: number | string;
};

export interface EventStackEntryType {
  callback: ClientEventCallbackType;
  event: ClientEventType;
}

export interface FileType {
  content?: string;
  extension?: string;
  language?: LanguageEnum;
  modified_timestamp?: number;
  name: string;
  path: string;
  relative_path?: string;
  size: number;
}

export interface EventOperationOptionsType {
  args?: any[];
  kwargs?: {
    boundingContainer?: DOMRect;
  };
}
export type SubmitEventOperationType = (
  event: ClientEventType,
  opts?: EventOperationOptionsType,
) => void;
