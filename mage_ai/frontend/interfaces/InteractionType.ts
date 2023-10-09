import { BlockLanguageEnum } from './BlockType';

export enum InteractionInputTypeEnum {
  CHECKBOX = 'checkbox',
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
  input_type?: InteractionInputStyleInputTypeEnum;
  multiline?: boolean;
}

export interface InteractionInputType {
  options?: InteractionInputOptionType[];
  style?: InteractionInputStyleType;
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
  language?: BlockLanguageEnum;
  uuid?: string;
  variables?: {
    [variable: string]: InteractionVariableType;
  };
}
