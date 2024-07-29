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

export type EventControlType = any;

export interface DragInfo {
  delta?: XYType;
  offset?: XYType;
  point?: XYType;
  velocity?: XYType;
}

export interface RectType {
  block?: any;
  bottom?: any;
  children?: any[];
  height?: any;
  id?: any;
  left?: any;
  parent?: any;
  right?: any;
  top?: any;
  upstream?: any[];
  width?: any;
  zIndex?: any;
}

export interface XYType {
  x?: number;
  y?: number;
}

export type ClientEventType = any;

export type HandleOperationType = any;

export type ClientEventCallbackType = any;

export interface EventStackEntryType {
  callback: any;
  event: any;
}

export interface FileType {
  content?: any;
  extension?: any;
  language?: any;
  modified_timestamp?: any;
  name: any;
  path: any;
  relative_path?: any;
  size: any;
}

export interface EventOperationOptionsType {
  args?: any[];
  kwargs?: any;
  handler?: any;
}

export type SubmitEventOperationType = any;

interface AppRouteType {
  Icon?: ({ ...props }: any) => any;
  description?: string;
  name?: string;
  uuid?: string;
}

export interface RouteType {
  app?: AppRouteType;
  route: {
    pathname?: string;
    href: string;
    params?: Record<string, string | string[]>;
    query?: Record<string, string | string[]>;
  };
  timestamp?: number;
}
