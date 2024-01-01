import { BlockLanguageEnum, BlockTypeEnum } from '@interfaces/BlockType';
import { FileExtensionEnum } from '@interfaces/FileType';
import { InteractionInputType } from '@interfaces/InteractionType';
import { OperationTypeEnum } from '@interfaces/PageComponentType';
import { removeUnderscore } from '@utils/string';

export enum ItemTagEnum {
  PINNED = 'pinned',
  RECENT = 'recent',
}

export enum ButtonActionTypeEnum {
  ADD_APPLICATION = 'add_application',
  CLOSE_APPLICATION = 'close_application',
  CUSTOM_ACTIONS = 'custom_actions',
  EXECUTE = 'execute',
  RESET_FORM = 'reset_form',
}

export enum ItemApplicationTypeEnum {
  DETAIL = 'detail',
  DETAIL_LIST = 'detail_list',
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
  PIPELINE_RUN = 'pipeline_run',
  SETTINGS = 'settings',
  TRIGGER = 'trigger',
}

interface TextStylesType {
  monospace?: boolean;
  regular?: boolean;
  small?: boolean;
}

interface DisplaySettingsType {
  color_uuid?: string;
  icon_uuid?: string;
  text_styles?: TextStylesType;
}

export const TYPE_TITLE_MAPPING = {
  [ItemTypeEnum.ACTION]: 'Cast',
  [ItemTypeEnum.CREATE]: 'Conjure',
  [ItemTypeEnum.DETAIL]: 'Enchant',
  [ItemTypeEnum.LIST]: 'Enchant',
  [ItemTypeEnum.NAVIGATE]: 'Teleport',
  [ItemTypeEnum.OPEN]: 'Summon',
  [ItemTypeEnum.SUPPORT]: 'Heal',
};

export const TYPE_TITLE_MAPPING_NORMAL = {
  [ItemTypeEnum.ACTION]: 'Action',
  [ItemTypeEnum.CREATE]: 'Create',
  [ItemTypeEnum.DETAIL]: 'View',
  [ItemTypeEnum.LIST]: 'View',
  [ItemTypeEnum.NAVIGATE]: 'Launch',
  [ItemTypeEnum.OPEN]: 'Open',
  [ItemTypeEnum.SUPPORT]: 'Support',
};

export const OBJECT_TITLE_MAPPING = {
  [ObjectTypeEnum.APPLICATION]: ObjectTypeEnum.APPLICATION,
  [ObjectTypeEnum.BLOCK]: ObjectTypeEnum.BLOCK,
  [ObjectTypeEnum.CHAT]: ObjectTypeEnum.CHAT,
  [ObjectTypeEnum.CODE]: ObjectTypeEnum.CODE,
  [ObjectTypeEnum.DOCUMENT]: ObjectTypeEnum.DOCUMENT,
  [ObjectTypeEnum.FILE]: ObjectTypeEnum.FILE,
  [ObjectTypeEnum.FOLDER]: ObjectTypeEnum.FOLDER,
  [ObjectTypeEnum.GIT]: ObjectTypeEnum.GIT,
  [ObjectTypeEnum.PIPELINE]: ObjectTypeEnum.PIPELINE,
  [ObjectTypeEnum.PIPELINE_RUN]: ObjectTypeEnum.PIPELINE_RUN,
  [ObjectTypeEnum.TRIGGER]: ObjectTypeEnum.TRIGGER,
};

export const OBJECT_TITLE_MAPPING_SHORT = {
  ...OBJECT_TITLE_MAPPING,
  [ObjectTypeEnum.APPLICATION]: 'app',
  [ObjectTypeEnum.DOCUMENT]: 'docs',
  [ObjectTypeEnum.PIPELINE_RUN]: 'run',
};

export function getButtonLabel(item): string {
  const {
    item_type: itemType,
    object_type: objectType,
  } = item;

  const parts = [];
  const objectLabel = removeUnderscore(
    OBJECT_TITLE_MAPPING_SHORT[item?.object_type] || '',
  ).toLowerCase();
  const itemTitle = TYPE_TITLE_MAPPING[itemType];

  if (ItemTypeEnum.ACTION === itemType) {
    parts.push(...[itemTitle, 'spell']);
  } else if ([
      ItemTypeEnum.CREATE,
      ItemTypeEnum.DETAIL,
      ItemTypeEnum.LIST,
      ItemTypeEnum.OPEN,
    ].includes(itemType)) {
    parts.push(...[itemTitle, objectLabel]);
  } else if (ItemTypeEnum.NAVIGATE === itemType) {
    parts.push(...[itemTitle, 'to', objectLabel]);
  } else if (ItemTypeEnum.SUPPORT === itemType) {
    parts.push(...['Get help from', objectLabel]);
  }

  return parts?.filter(i => i?.length >= 1).join(' ');
}

interface BlockMetadataType {
  file_path?: string;
  language?: BlockLanguageEnum;
  pipelines: any[];
  type?: BlockTypeEnum;
}

interface PipelineMetadataType {
  blocks: BlockMetadataType[];
  description: string;
  name: string;
  repo_path: string;
  tags: string[];
  type: string;
  updated_at: string;
  uuid: string;
}

interface FileMetadataType {
  extension?: string;
  full_path?: string;
  modified_at?: string;
  modified_timestamp?: number;
  size?: number;
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

export interface CommandCenterActionPageType {
  external?: boolean;
  open_new_window?: boolean;
  path: string;
  parameters?: KeyValueType;
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

export interface FormInputType extends InteractionInputType {
  action_uuid?: string;
  description?: string;
  display_settings?: DisplaySettingsType;
  label?: string;
  monospace?: boolean;
  name?: string;
  placeholder?: string;
  required?: boolean;
  value?: string | number;
}

export interface ButtonActionType {
  action_types: ButtonActionTypeEnum[];
  actions?: CommandCenterActionType[];
  display_settings?: DisplaySettingsType;
  keyboard_shortcuts?: (number | string)[][] | (number | string)[];
  label: string
  tooltip?: string;
}

export interface ItemApplicationType {
  actions?: CommandCenterActionType[];
  application_type: ItemApplicationTypeEnum;
  buttons?: ButtonActionType[];
  settings: FormInputType[];
  uuid: string;
}

interface AttributeDisplaySettingsType {
  description?: DisplaySettingsType;
  icon?: DisplaySettingsType;
  item?: DisplaySettingsType;
}

export interface PageHistoryType {
  path: string;
  pathname: string;
  query?: KeyValueType;
  timestamp?: number;
  title: string;
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
  applications?: ItemApplicationType[];
  display_settings_by_attribute?: AttributeDisplaySettingsType;
  description?: string;
  item_type: ItemTypeEnum;
  items?: CommandCenterItemType[];
  metadata?: {
    block?: BlockMetadataType;
    file?: FileMetadataType;
    page?: PageHistoryType;
    pipeline?: PipelineMetadataType;
    pipeline_run?: {
      backfill_id?: number;
      completed_at?: string;
      execution_date?: string;
      executor_type?: string;
      id?: number;
      metrics?: KeyValueType;
      passed_sla?: boolean;
      pipeline_schedule_id?: number;
      pipeline_uuid?: string;
      started_at?: string;
      status?: string;
    };
    trigger?: {
      description?: string;
      global_data_product_uuid?: string;
      id?: number;
      name?: string;
      pipeline_uuid?: string;
      repo_path?: string;
      schedule_interval?: string;
      schedule_type?: string;
      settings?: string;
      sla?: string;
      start_time?: string;
      status?: string;
    };
  };
  object_type: ObjectTypeEnum;
  score?: number;
  tags?: ItemTagEnum[];
  title: string;
  uuid: string;
}

export interface CommandCenterSearchHistoryType {
  item: CommandCenterItemType;
  items: CommandCenterItemType[];
  searchText: string;
}
