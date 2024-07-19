import { EventEnum, KeyEnum } from './enums';

interface KeyType {
  altKey?: boolean;
  ctrlKey?: boolean;
  key?: any;
  metaKey?: boolean;
  shiftKey?: boolean;
  type?: any;
}
export type KeyboardPositionType = number[];

export type KeyboardPositionTargetType = Record<string, any>;

export interface CustomKeyboardEventType extends KeyType {
  timestamp: number;
}

export interface PredicateType extends KeyType {
  predicates?: any[];
  present?: boolean;
}

export interface CommandType {
  handler: (event: any) => void;
  predicate: any;
  priority?: number;
  uuid?: string;
}

export type DetailType = Record<string, any> & {
  dispatcher: any;
};

export type KeyboardDetailType = {
  position?: KeyboardPositionType;
  previousPosition?: KeyboardPositionType;
  previousTarget?: KeyboardPositionTargetType;
  target?: KeyboardPositionTargetType;
} & DetailType;

export class CustomAppEvent<T = any> extends Event {
  detail: T;
  constructor(type: any, detail: T) {
    super(type);
    this.detail = detail || ({} as T);
  }
}

export class CustomKeyboardEvent<T = any>  extends KeyboardEvent {
  detail: any;
  key: any;

  constructor(type: any, detail: any, args?: any | any[]) {
    super(type);
    this.detail = detail || ({} as T);
    [this.key] = Array.isArray(args) ? args : [args];
  }
}

export type EventSubscription = Record<string | any, any>;
