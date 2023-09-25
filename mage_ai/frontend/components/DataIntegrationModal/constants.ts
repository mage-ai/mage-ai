export enum MainNavigationTabEnum {
  CONFIGURATION = 'configuration',
  STREAMS = 'streams',
  SYNC = 'sync',
}

export const MAIN_NAVIGATION_TAB_DISPLAY_NAME_MAPPING = {
  [MainNavigationTabEnum.CONFIGURATION]: 'Configuration',
  [MainNavigationTabEnum.STREAMS]: 'Sync',
  [MainNavigationTabEnum.SYNC]: 'Streams',
};
