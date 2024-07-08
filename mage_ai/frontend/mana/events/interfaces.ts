import { EventEnum, KeyEnum } from './enums';

interface KeyType {
  altKey?: boolean;
  ctrlKey?: boolean;
  key?: KeyEnum;
  metaKey?: boolean;
  shiftKey?: boolean;
  type?: EventEnum;
}
export type KeyboardPositionType = number[];

export type KeyboardPositionTargetType = Record<string, any>;

export interface CustomKeyboardEventType extends KeyType {
  timestamp: number;
}

export interface PredicateType extends KeyType {
  predicates?: PredicateType[];
  present?: boolean;
}

export interface CommandType {
  handler: (event: CustomKeyboardEventType) => void;
  predicate: PredicateType;
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

export class CustomEvent<T = any> extends Event {
  detail: T;
  constructor(type: EventEnum, detail: T) {
    super(type);
    this.detail = detail || ({} as T);
  }
}

export class CustomKeyboardEvent extends CustomEvent {
  public key: KeyEnum;
  public type: EventEnum;

  constructor(type: EventEnum, detail: KeyboardDetailType, args?: any | any[]) {
    super(type, detail);
    [this.key] = Array.isArray(args) ? args : [args];
  }
}

export type EventSubscription = Record<string | EventEnum, any>;
