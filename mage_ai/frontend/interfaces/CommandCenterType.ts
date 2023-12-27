import { BlockTypeEnum } from '@interfaces/BlockType';
import { FileExtensionEnum } from '@interfaces/FileType';
import { OperationTypeEnum } from '@interfaces/PageComponentType';

export enum CommandCenterTypeEnum {
  ACTION = 'action',
  APPLICATION = 'application',
  BLOCK = 'block',
  FILE = 'file',
  PIPELINE = 'pipeline',
  TRIGGER = 'trigger',
}

export const TYPE_TITLE_MAPPING = {
  [CommandCenterTypeEnum.ACTION]: 'Cast',
  [CommandCenterTypeEnum.APPLICATION]: 'Teleport',
  [CommandCenterTypeEnum.BLOCK]: 'Enchant',
  [CommandCenterTypeEnum.FILE]: 'Summon',
  [CommandCenterTypeEnum.PIPELINE]: 'Enchant',
  [CommandCenterTypeEnum.TRIGGER]: 'Enchant',
};

interface BlockMetadataType {
  type?: BlockTypeEnum;
}

interface FileMetadataType {
  extension?: FileExtensionEnum;
}

interface CommandCenterActionBaseType {
  interaction?: any;
  page?: any;
  request?: any;
}

export enum CommandCenterActionInteractionTypeEnum {
  CLICK = 'click',
  OPEN_FILE = 'open_file',
  SCROLL = 'scroll',
}

export interface KeyValueType {
  [key: string]: string | string[] | number | number[] | boolean | boolean[] | KeyValueType | KeyValueType[];
}

export interface CommandCenterActionRequestType {
  operation: OperationTypeEnum;
  payload?: KeyValueType;
  payload_resource_key?: string;
  query?: KeyValueType;
  resource: string;
  resource_id: string | number;
  resource_parent: string;
  resource_parent_id: string | number;
  response_resource_key: string;
}

export interface CommandCenterActionInteractionType {
  element: {
    className?: string;
    id?: string;
  };
  options?: KeyValueType;
  type?: CommandCenterActionInteractionTypeEnum;
}

interface CommandCenterActionPageType {
  external?: boolean;
  openNewWindow?: boolean;
  path: string;
  query?: KeyValueType;
}

interface CommandCenterActionType extends CommandCenterActionBaseType {
  delay?: number;
  interaction?: CommandCenterActionInteractionType;
  page?: CommandCenterActionPageType;
  request?: CommandCenterActionRequestType;
}

export interface CommandCenterItemType {
  actionResults?: {
    [index: number]: {
      action: CommandCenterActionType;
      model?: KeyValueType;
      models?: KeyValueType[];
      result?: any;
    };
  };
  actions?: CommandCenterActionType[];
  description?: string;
  items?: CommandCenterItemType[];
  metadata?: {
    block?: BlockMetadataType;
    file?: FileMetadataType;
  };
  subtype?: CommandCenterTypeEnum;
  title: string;
  type: CommandCenterTypeEnum;
  uuid: string;
}

export interface CommandCenterSearchHistoryType {
  item: CommandCenterItemType;
  items: CommandCenterItemType[];
  searchText: string;
}
