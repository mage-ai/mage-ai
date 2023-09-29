import BlockType from '@interfaces/BlockType';
import PipelineType from '@interfaces/PipelineType';
import { AttributeUUIDEnum } from '@utils/models/block';
import { TabType } from '@oracle/components/Tabs/ButtonTabs';

export enum InputTypeEnum {
  CHECKBOX = 'checkbox',
  CUSTOM = 'custom',
  SELECT = 'select',
  TOGGLE = 'toggle',
}

export interface OptionType {
  label?: () => string;
  value: string | number;
}

export interface AttributeType {
  inputType: InputTypeEnum;
  label: () => string;
  options?: OptionType[];
  uuid: AttributeUUIDEnum | string;
}

export enum MainNavigationTabEnum {
  CONFIGURATION = 'configuration',
  OVERVIEW = 'overview',
  STREAMS = 'streams',
  SYNC = 'sync',
}

export type OpenDataIntegrationModalOptionsType = {
  block: BlockType,
  contentByBlockUUID?: any;
  defaultMainNavigationTab?: MainNavigationTabEnum | string;
  defaultMainNavigationTabSub?: string;
  defaultSubTab?: string;
  onChangeBlock?: (block: BlockType) => void;
  savePipelineContent?: (payload?: {
    block?: BlockType;
    pipeline?: PipelineType;
  }) => Promise<any>;
}

export type OpenDataIntegrationModalType = {
  showDataIntegrationModal?: (opts?: OpenDataIntegrationModalOptionsType) => void;
};

export const MAIN_TABS_EXCEPT_STREAM_DETAIL = {
  [MainNavigationTabEnum.CONFIGURATION]: MainNavigationTabEnum.CONFIGURATION,
  [MainNavigationTabEnum.OVERVIEW]: MainNavigationTabEnum.OVERVIEW,
  [MainNavigationTabEnum.STREAMS]: MainNavigationTabEnum.STREAMS,
  [MainNavigationTabEnum.SYNC]: MainNavigationTabEnum.SYNC,
};

export const MAIN_NAVIGATION_TAB_DISPLAY_NAME_MAPPING = {
  [MainNavigationTabEnum.CONFIGURATION]: 'Configuration',
  [MainNavigationTabEnum.OVERVIEW]: 'Overview',
  [MainNavigationTabEnum.STREAMS]: 'Streams',
  [MainNavigationTabEnum.SYNC]: 'Sync',
};

export enum SubTabEnum {
  BOOKMARKS = 'bookmarks',
  CREDENTIALS = 'credentials',
  OVERVIEW = 'overview',
  UPSTREAM_BLOCK_SETTINGS = 'upstream_block_settings',
  SETTINGS = 'settings',
  SAMPLE_DATA = 'sample_data',
}

export const SUB_TABS_BY_MAIN_NAVIGATION_TAB: {
  [key: string]: TabType[];
} = {
  [MainNavigationTabEnum.CONFIGURATION]: [
    {
      label: () => 'Credentials',
      uuid: SubTabEnum.CREDENTIALS,
    },
    {
      label: () => 'Upstream block settings',
      uuid: SubTabEnum.UPSTREAM_BLOCK_SETTINGS,
    },
  ],
  [MainNavigationTabEnum.SYNC]: [
    {
      label: () => 'Bookmarks',
      uuid: SubTabEnum.BOOKMARKS,
    },
  ],
  [MainNavigationTabEnum.STREAMS]: [],
  [MainNavigationTabEnum.OVERVIEW]: [],
};

export const SUB_TABS_FOR_STREAM_DETAIL = [
  {
    label: () => 'Overview',
    uuid: SubTabEnum.OVERVIEW,
  },
  {
    label: () => 'Schema properties',
    uuid: SubTabEnum.SETTINGS,
  },
  {
    label: () => 'Sample data',
    uuid: SubTabEnum.SAMPLE_DATA,
  },
];
