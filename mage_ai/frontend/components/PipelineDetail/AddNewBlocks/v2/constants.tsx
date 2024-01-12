import { BlockTypeEnum, ObjectType } from '@interfaces/BlockType';
import { UIElementConfigurationsType } from '@interfaces/CustomDesignType';

export const ITEMS_MORE: 'items_more' = 'items_more';
export const ITEM_BROWSE_TEMPLATES: 'templates/list' = 'templates/list';
export const ITEM_CREATE_TEMPLATE: 'templates/new' = 'templates/new';

export const BUTTON_ITEMS_DEFAULT = [
  BlockTypeEnum.CUSTOM,
  BlockTypeEnum.MARKDOWN,
];

export const ITEMS_MORE_UUIDS_ORDERED = [
  BlockTypeEnum.DATA_LOADER,
  BlockTypeEnum.TRANSFORMER,
  BlockTypeEnum.DATA_EXPORTER,
  BlockTypeEnum.CUSTOM,
  BlockTypeEnum.DBT,
  BlockTypeEnum.SENSOR,
  BlockTypeEnum.GLOBAL_DATA_PRODUCT,
  BlockTypeEnum.MARKDOWN,
  ITEM_BROWSE_TEMPLATES,
  ITEM_CREATE_TEMPLATE,
];
