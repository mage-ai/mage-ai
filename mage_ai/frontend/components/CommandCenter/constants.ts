import {
  CommandCenterItemType,
  ItemApplicationType,
  ItemApplicationTypeEnum,
  ObjectTypeEnum,
} from '@interfaces/CommandCenterType';
import { InvokeRequestActionType } from './ItemApplication/constants';

export enum ItemRowClassNameEnum {
  ITEM_ROW = 'item-row',
  ITEM_ROW_CATEGORY = 'item-row-category',
}

export enum InputElementEnum {
  MAIN = 'main',
}

export type ApplicationConfiguration = {
  application: ItemApplicationType;
  executeAction: (item: CommandCenterItemType, focusedItemIndex: number) => Promise<any>;
  focusedItemIndex: number;
  item: CommandCenterItemType;
  itemsRef?: any;
} & InvokeRequestActionType;

export function getInputPlaceholder({
  applicationType,
  item,
}: {
  applicationType?: ItemApplicationTypeEnum;
  item?: CommandCenterItemType;
} = {}) {
  if (ObjectTypeEnum.PIPELINE === item?.object_type) {
    if (ItemApplicationTypeEnum.DETAIL_LIST === applicationType) {
      return `Search blocks and triggers in ${item?.title}`;
    }
  }

  return 'Search actions, apps, files, blocks, pipelines, triggers';
}

