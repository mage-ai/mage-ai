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
  application,
  item,
}: {
  application?: ItemApplicationType;
  item?: CommandCenterItemType;
} = {}) {
  if (ItemApplicationTypeEnum.DETAIL_LIST === application?.application_type) {
    if (ObjectTypeEnum.PIPELINE === item?.object_type) {
      return `Search blocks and triggers in ${item?.title}`;
    } else if (ObjectTypeEnum.TRIGGER === item?.object_type) {
      return `Search runs or run ${item?.title || 'this'} trigger once`;
    }
  }

  return 'Search actions, apps, files, blocks, pipelines, triggers';
}
