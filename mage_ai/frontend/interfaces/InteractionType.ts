export enum InteractionInputTypeEnum {
  CHECKBOX = 'checkbox',
  DROPDOWN_MENU = 'dropdown_menu',
  SWITCH = 'switch',
  TEXT_FIELD = 'text_field',
}

export enum InteractionVariableTypeEnum {
  DATE = 'date',
  DATETIME = 'datetime',
  DICTIONARY = 'dictionary',
  FLOAT = 'float',
  INTEGER = 'integer',
  LIST = 'list',
  STRING = 'string',
}

export interface InteractionInputOptionType {
  label: string;
  value: boolean | number | string;
}

export interface InteractionInputStyleType {
  multiline?: boolean;
}

export interface InteractionInputType {
  options?: InteractionInputOptionType[];
  style?: InteractionInputStyleType;
  type: InteractionInputTypeEnum;
}

export interface InteractionLayoutItemType {
  variable: string;
  width: number;
}

export interface InteractionVariableType {
  description?: string;
  input?: string;
  name?: string;
  required?: boolean;
  types?: InteractionVariableTypeEnum[];
  uuid: string;
}

export default interface InteractionType {
  inputs?: {
    [uuid: string]: InteractionInputType;
  };
  layout?: InteractionLayoutItemType[][];
  variables?: {
    [variable: string]: InteractionVariableType;
  };
}
