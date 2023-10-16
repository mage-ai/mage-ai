import { SparkConfigType } from '@interfaces/ProjectType';

export enum MainNavigationTabEnum {
  CONNECTION = 'CONNECTION',
  RESOURCES = 'RESOURCES',
  MONITORING = 'MONITORING',
}

export const MAIN_NAVIGATION_TAB_DISPLAY_NAME_MAPPING = {
  [MainNavigationTabEnum.CONNECTION]: 'Connection',
  [MainNavigationTabEnum.RESOURCES]: 'Resources',
  [MainNavigationTabEnum.MONITORING]: 'Monitoring',
};

export type ObjectAttributesType = {
  spark_config?: SparkConfigType;
};
