import { BlockLanguageEnum, BlockTypeEnum } from '@interfaces/BlockType';
import { FileExtensionEnum } from '@interfaces/FileType';
import { InteractionInputType } from '@interfaces/InteractionType';
import { OperationTypeEnum } from '@interfaces/PageComponentType';
import { removeUnderscore } from '@utils/string';
import {
  VersionControlBranch,
  VersionControlCommit,
  VersionControlProject,
  VersionControlRemote,
} from './VersionControlType';

export enum ApplicationExpansionUUIDEnum {
  ArcaneLibrary = 'ArcaneLibrary',
  PortalTerminal = 'PortalTerminal',
  VersionControlFileDiffs = 'VersionControlFileDiffs',
}

export enum RenderLocationTypeEnum {
  ITEMS_CONTAINER_AFTER = 'items_container_after',
}

export enum ItemTagEnum {
  PINNED = 'pinned',
  RECENT = 'recent',
}

export enum ValidationTypeEnum {
  CONFIRMATION = 'confirmation',
  CUSTOM_VALIDATION_PARSERS = 'custom_validation_parsers',
}

export enum ButtonActionTypeEnum {
  ADD_APPLICATION = 'add_application',
  CLOSE_APPLICATION = 'close_application',
  CLOSE_COMMAND_CENTER = 'close_command_center',
  CUSTOM_ACTIONS = 'custom_actions',
  EXECUTE = 'execute',
  REPLACE_APPLICATION = 'replace_application',
  RESET_FORM = 'reset_form',
  SELECT_ITEM_FROM_REQUEST = 'select_item_from_request',
}

export enum ItemApplicationTypeEnum {
  DETAIL = 'detail',
  DETAIL_LIST = 'detail_list',
  EXPANSION = 'expansion',
  FORM = 'form',
  LIST = 'list'
}

export enum ItemTypeEnum {
  ACTION = 'action',
  CREATE = 'create',
  DELETE = 'delete',
  DETAIL = 'detail',
  LIST = 'list',
  MODE_ACTIVATION = 'mode_activation',
  MODE_DEACTIVATION = 'mode_deactivation',
  NAVIGATE = 'navigate',
  OPEN = 'open',
  SUPPORT = 'support',
  UPDATE = 'update',
}

export enum ObjectTypeEnum {
  APPLICATION = 'application',
  APPLICATION_EXPANSION = 'application_expansion',
  AUTHENTICATION = 'authentication',
  BLOCK = 'block',
  BRANCH = 'branch',
  CHAT = 'chat',
  CODE = 'code',
  DOCUMENT = 'document',
  FILE = 'file',
  FOLDER = 'folder',
  PIPELINE = 'pipeline',
  PIPELINE_RUN = 'pipeline_run',
  PROJECT = 'project',
  REMOTE = 'remote',
  SETTINGS = 'settings',
  TERMINAL = 'terminal',
  TRIGGER = 'trigger',
  VERSION_CONTROL_FILE = 'version_control_file',
}

export enum ModeTypeEnum {
  VERSION_CONTROL = 'version_control',
}

interface TextStylesType {
  monospace?: boolean;
  muted?: boolean;
  regular?: boolean;
  small?: boolean;
}

interface DisplaySettingsType {
  color_uuid?: string;
  icon_uuid?: string;
  stroke_uuid?: string;
  text_styles?: TextStylesType;
}

export const TYPE_TITLE_MAPPING = {
  [ItemTypeEnum.ACTION]: 'Cast',
  [ItemTypeEnum.CREATE]: 'Conjure',
  [ItemTypeEnum.DELETE]: 'Destroy',
  [ItemTypeEnum.DETAIL]: 'Enchant',
  [ItemTypeEnum.LIST]: 'Enchant',
  [ItemTypeEnum.NAVIGATE]: 'Teleport',
  [ItemTypeEnum.OPEN]: 'Summon',
  [ItemTypeEnum.SUPPORT]: 'Heal',
  [ItemTypeEnum.UPDATE]: 'Alchemize',
};

export const TYPE_TITLE_MAPPING_NORMAL = {
  [ItemTypeEnum.ACTION]: 'Action',
  [ItemTypeEnum.CREATE]: 'Create',
  [ItemTypeEnum.DELETE]: 'Delete',
  [ItemTypeEnum.DETAIL]: 'View',
  [ItemTypeEnum.LIST]: 'View',
  [ItemTypeEnum.NAVIGATE]: 'Launch',
  [ItemTypeEnum.OPEN]: 'Open',
  [ItemTypeEnum.SUPPORT]: 'Support',
  [ItemTypeEnum.UPDATE]: 'Update',
};

export const OBJECT_TITLE_MAPPING = {
  [ObjectTypeEnum.APPLICATION]: ObjectTypeEnum.APPLICATION,
  [ObjectTypeEnum.BLOCK]: ObjectTypeEnum.BLOCK,
  [ObjectTypeEnum.BRANCH]: ObjectTypeEnum.BRANCH,
  [ObjectTypeEnum.CHAT]: ObjectTypeEnum.CHAT,
  [ObjectTypeEnum.CODE]: ObjectTypeEnum.CODE,
  [ObjectTypeEnum.DOCUMENT]: ObjectTypeEnum.DOCUMENT,
  [ObjectTypeEnum.FILE]: ObjectTypeEnum.FILE,
  [ObjectTypeEnum.FOLDER]: ObjectTypeEnum.FOLDER,
  [ObjectTypeEnum.PIPELINE]: ObjectTypeEnum.PIPELINE,
  [ObjectTypeEnum.PIPELINE_RUN]: ObjectTypeEnum.PIPELINE_RUN,
  [ObjectTypeEnum.PROJECT]: ObjectTypeEnum.PROJECT,
  [ObjectTypeEnum.REMOTE]: ObjectTypeEnum.REMOTE,
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

export enum CommandCenterStateEnum {
  CLOSED = 'CLOSED',
  MOUNTED = 'MOUNTED',
  OPEN = 'OPEN',
}

export enum CommandCenterActionInteractionTypeEnum {
  CLICK = 'click',
  CLOSE_APPLICATION = 'close_application',
  CLOSE_COMMAND_CENTER = 'close_command_center',
  FETCH_ITEMS = 'fetch_items',
  OPEN_FILE = 'open_file',
  RESET_FORM = 'reset_form',
  SCROLL = 'scroll',
  SELECT_ITEM = 'select_item',
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
  item: CommandCenterItemType;
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

export interface RenderOptionsType {
  location: RenderLocationTypeEnum;
}

interface ApplicationStateParserType {
  function_body: string;
  // Should almost always be something like this:
/*
dict(
            positional_argument_names=[
                'item',
                'action',
                'applicationState',
                'options',
            ],
            function_body="""
const names = Object.keys(applicationState?.VersionControlFileDiffs?.files || {})?.join(' ');
action.request.payload.version_control_file.add = names
return action
""",
*/

  positional_argument_names: string[];
}

export interface CommandCenterActionType extends CommandCenterActionBaseType {
  application_state_parsers?: ApplicationStateParserType[];
  delay?: number;
  interaction?: CommandCenterActionInteractionType;
  page?: CommandCenterActionPageType;
  render_options?: RenderOptionsType;
  request?: CommandCenterActionRequestType;
  upstream_action_value_key_mapping?: KeyValueType;
  uuid: string;
  validation_parsers?: ApplicationStateParserType[];
  validations?: ValidationTypeEnum[];
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

interface ConfigurationRequestsType {
  files?: CommandCenterActionRequestType;
}

interface ApplicationConfigurationsType {
  interaction_parsers?: {
    [key: string]: {
      action_uuid: string;
      name: string;
    };
  };
  requests?: ConfigurationRequestsType;
}

interface ExpansionSettingsType {
  uuid: ApplicationExpansionUUIDEnum;
}

export interface ItemApplicationType {
  actions?: CommandCenterActionType[];
  application_type: ItemApplicationTypeEnum;
  buttons?: ButtonActionType[];
  configurations?: ApplicationConfigurationsType;
  expansion_settings?: ExpansionSettingsType;
  settings: FormInputType[];
  uuid: string;
}

interface AttributeDisplaySettingsType {
  description?: DisplaySettingsType;
  icon?: DisplaySettingsType;
  item?: DisplaySettingsType;
  subtitle?: DisplaySettingsType;
}

export interface PageHistoryType {
  href?: string;
  origin?: string;
  path: string;
  pathname: string;
  query?: KeyValueType;
  timestamp?: number;
  title: string;
}

export interface ModeType {
  disable_cache_items?: boolean;
  type: ModeTypeEnum;
  version_control?: {
    branch?: VersionControlBranch;
    commit?: VersionControlCommit
    project?: VersionControlProject;
    remote?: VersionControlRemote;
  };
}

interface ItemSettingsType {
  cache_expires_at?: number;
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
    application?: ItemApplicationType;
    block?: BlockMetadataType;
    branch?: {
      current: boolean;
      name: string;
      output:  string[];
      project_uuid: string;
      remote: string;
      repo_path: string;
    };
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
    project?: {
      output:  string[];
      repo_path: string;
      user: {
        email: string;
        name: string;
      };
      uuid: string;
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
  mode?: ModeType;
  object_type?: ObjectTypeEnum;
  score?: number;
  settings?: ItemSettingsType;
  subtitle?: string;
  tags?: ItemTagEnum[];
  title: string;
  uuid: string;
}

export interface CommandCenterSearchHistoryType {
  item: CommandCenterItemType;
  items: CommandCenterItemType[];
  searchText: string;
}
