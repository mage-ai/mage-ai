import { TabType } from '@oracle/components/Tabs/ButtonTabs';

export enum MainNavigationTabEnum {
  CONFIGURATION = 'configuration',
  OVERVIEW = 'overview',
  STREAMS = 'streams',
  SYNC = 'sync',
}

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
  [key: SubTabEnum]: TabType;
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
    label: () => 'Settings',
    uuid: SubTabEnum.SETTINGS,
  },
  {
    label: () => 'Sample data',
    uuid: SubTabEnum.SAMPLE_DATA,
  },
];
