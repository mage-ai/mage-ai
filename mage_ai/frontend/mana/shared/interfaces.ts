import BlockType, { BlockTypeEnum } from '@interfaces/BlockType';
import { MenuGroupType } from '@mana/components/Menu/interfaces';
import React from 'react';
import { ButtonEnum, LanguageEnum } from './enums';
import { MutateType } from '@api/interfaces';
import { RemoveContextMenuType, RenderContextMenuType } from '../hooks/useContextMenu';
import { LayoutConfigType, NodeItemType } from '@components/v2/Canvas/interfaces';

export enum EventOperationEnum {
  APP_START = 'app.start',
  CONTEXT_MENU_OPEN = 'context_menu.open',
  DRAGGING = 'drag.active',
  DRAG_END = 'drag.end',
  DRAG_START = 'drag.start',
  DROP_START = 'drop.start',
  EXECUTE_CODE = 'execute.code',
  MOUSE_DOWN = 'mouse.down',
  MUTATE_MODEL_BLOCK = 'mutate.model.block',
}

export type EventControlType = {
  preventDefault?: boolean;
  preventDefaultCondition?: (event: ClientEventType) => boolean;
  stopPropagation?: boolean;
  stopPropagationCondition?: (event: ClientEventType) => boolean;
};

export interface RectType {
  bottom?: number;
  height?: number;
  id?: string;
  left: number;
  right?: number;
  top: number;
  upstream?: RectType[];
  width?: number;
  zIndex?: number;
}

export type ClientEventType = {
  button?: ButtonEnum;
  control?: EventControlType;
  data?: Record<string, BlockType | any> | {
    app?: any;
    block?: BlockType;
    node?: any;
    nodes?: any[];
  };
  handle?: HandleOperationType;
  operationTarget?: HTMLElement | React.RefObject<HTMLElement> | React.RefObject<HTMLDivElement>
  | React.RefObject<Element> | null;
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
    computedStyle?: CSSStyleDeclaration;
    conditions?: {
      block?: {
        groups?: string[];
        type?: BlockTypeEnum;
      };
      level?: number;
      type?: NodeItemType['type'];
    }[];
    groups?: MenuGroupType[];
    layoutConfig?: LayoutConfigType;
    level?: number;
    process?: {
      message: string;
      message_request_uuid: string;
    };
    rect?: {
      height?: number;
      left?: number;
      top?: number;
      width?: number;
      offset?: {
        height?: number;
        left?: number;
        top?: number;
        width?: number;
      };
    };
  };
  handler?: (
    event: ClientEventType,
    handlers: Record<string, MutateType>,
    callbacks: {
      removeContextMenu: RemoveContextMenuType;
      renderContextMenu: RenderContextMenuType;
    },
  ) => void;
}
export type SubmitEventOperationType = (
  event: ClientEventType,
  opts?: EventOperationOptionsType,
) => void;
