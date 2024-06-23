export enum InteractionInputTypeEnum {
  CHECKBOX = 'checkbox',
  CODE = 'code',
  DROPDOWN_MENU = 'dropdown_menu',
  SWITCH = 'switch',
  TEXT_FIELD = 'text_field',
}

export const INTERACTION_INPUT_TYPES = [
  InteractionInputTypeEnum.CHECKBOX,
  InteractionInputTypeEnum.DROPDOWN_MENU,
  InteractionInputTypeEnum.SWITCH,
  InteractionInputTypeEnum.TEXT_FIELD,
];

export enum InteractionVariableTypeEnum {
  BOOLEAN = 'boolean',
  DATE = 'date',
  DATETIME = 'datetime',
  DICTIONARY = 'dictionary',
  FLOAT = 'float',
  INTEGER = 'integer',
  LIST = 'list',
  STRING = 'string',
}

export const INTERACTION_VARIABLE_VALUE_TYPES = [
  InteractionVariableTypeEnum.BOOLEAN,
  InteractionVariableTypeEnum.DATE,
  InteractionVariableTypeEnum.DATETIME,
  InteractionVariableTypeEnum.DICTIONARY,
  InteractionVariableTypeEnum.FLOAT,
  InteractionVariableTypeEnum.INTEGER,
  InteractionVariableTypeEnum.LIST,
  InteractionVariableTypeEnum.STRING,
];

export interface InteractionInputOptionType {
  label: string;
  value: boolean | number | string;
}

export enum InteractionInputStyleInputTypeEnum {
  NUMBER = 'number',
}

export interface InteractionInputStyleType {
  default?: boolean;
  input_type?: InteractionInputStyleInputTypeEnum;
  language?: string;
  monospace?: boolean;
  multiline?: boolean;
  muted?: boolean;
}

export interface InteractionInputType {
  description?: string;
  label?: string;
  options?: InteractionInputOptionType[];
  style?: InteractionInputStyleType;
  text?: string[];
  type?: InteractionInputTypeEnum;
}

export interface InteractionLayoutItemType {
  max_width_percentage?: number;
  variable?: string;
  width?: number;
}

export interface InteractionVariableType {
  description?: string;
  input?: string;
  name?: string;
  required?: boolean;
  types?: InteractionVariableTypeEnum[];
  uuid?: string;
}

export default interface InteractionType {
  block_uuid?: string;
  content?: string;
  inputs?: {
    [uuid: string]: InteractionInputType;
  };
  layout?: InteractionLayoutItemType[][];
  language?: any;
  uuid?: string;
  variables?: {
    [variable: string]: InteractionVariableType;
  };
}
