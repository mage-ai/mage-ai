import { BlockTypeEnum } from '@interfaces/BlockType';
import { FileExtensionEnum } from '@interfaces/FileType';
import { InteractionInputType } from '@interfaces/InteractionType';
import { OperationTypeEnum } from '@interfaces/PageComponentType';

export enum ItemApplicationTypeEnum {
  FORM = 'form',
}

export enum ItemTypeEnum {
  ACTION = 'action',
  CREATE = 'create',
  DETAIL = 'detail',
  LIST = 'list',
  NAVIGATE = 'navigate',
  OPEN = 'open',
  SUPPORT = 'support',
}

export enum ObjectTypeEnum {
  APPLICATION = 'application',
  BLOCK = 'block',
  CHAT = 'chat',
  CODE = 'code',
  DOCUMENT = 'document',
  FILE = 'file',
  FOLDER = 'folder',
  GIT = 'git',
  PIPELINE = 'pipeline',
  TRIGGER = 'trigger',
}

export const TYPE_TITLE_MAPPING = {
  [ItemTypeEnum.ACTION]: 'Cast',
  [ItemTypeEnum.CREATE]: 'Conjure',
  [ItemTypeEnum.DETAIL]: 'Scry',
  [ItemTypeEnum.LIST]: 'Scry',
  [ItemTypeEnum.NAVIGATE]: 'Teleport',
  [ItemTypeEnum.OPEN]: 'Summon',
  [ItemTypeEnum.SUPPORT]: 'Heal',
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
  query?: KeyValueType;
  resource: string;
  resource_id?: string | number;
  resource_parent?: string;
  resource_parent_id?: string | number;
  response_resource_key: string;
}

export interface CommandCenterActionInteractionType {
  element?: {
    class_name?: string;
    id?: string;
  };
  options?: KeyValueType;
  type: CommandCenterActionInteractionTypeEnum;
}

interface CommandCenterActionPageType {
  external?: boolean;
  open_new_window?: boolean;
  path: string;
  query?: KeyValueType;
}

export interface CommandCenterActionType extends CommandCenterActionBaseType {
  delay?: number;
  interaction?: CommandCenterActionInteractionType;
  page?: CommandCenterActionPageType;
  request?: CommandCenterActionRequestType;
  upstream_action_value_key_mapping?: KeyValueType;
  uuid: string;
}

interface FormInputType extends InteractionInputType {
  action_uuid?: string;
  description?: string;
  label?: string;
  icon_uuid?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
}

export interface ItemApplicationType {
  application_type: ItemApplicationTypeEnum;
  settings: FormInputType[];
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
  application?: ItemApplicationType;
  description?: string;
  color_uuid?: string;
  icon_uuid?: string;
  item_type: ItemTypeEnum;
  items?: CommandCenterItemType[];
  metadata?: {
    block?: BlockMetadataType;
    file?: FileMetadataType;
  };
  object_type: ObjectTypeEnum;
  title: string;
  uuid: string;
}

export interface CommandCenterSearchHistoryType {
  item: CommandCenterItemType;
  items: CommandCenterItemType[];
  searchText: string;
}

export interface PageHistoryType {
  asPath: string;
  pathname: string;
  query?: KeyValueType;
  title: string;
}
