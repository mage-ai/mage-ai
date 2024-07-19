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

// Check if the environment supports KeyboardEvent
const supportsKeyboardEvent = typeof KeyboardEvent !== 'undefined';

// Extend KeyboardEvent and add custom properties
export class CustomKeyboardEvent<T = any> extends (supportsKeyboardEvent ? KeyboardEvent : Event) {
  detail: T;

  constructor(type: string, init: KeyboardEventInit & { detail?: T; key?: any } = {}) {
    super(type, init);
    const { detail, key } = init;
    this.detail = detail || ({} as T);
    if (key !== undefined) {
      // If key is provided, override the base class key property
      Object.defineProperty(this, 'key', {
        value: key,
        enumerable: true,
      });
    }
  }
}

export type EventSubscription = Record<string | any, any>;
