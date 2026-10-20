import { EventEnum, KeyEnum } from './types';

interface KeyType {
  altKey?: boolean;
  ctrlKey?: boolean;
  key: KeyEnum;
  metaKey?: boolean;
  shiftKey?: boolean;
  type?: EventEnum;
}

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
