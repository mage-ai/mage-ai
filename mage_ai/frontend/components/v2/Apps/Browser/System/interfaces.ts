import { FileType } from '../../../IDE/interfaces';
import { ItemTypeEnum } from './enums';

export interface ItemDetailType extends FileType {
  items?: ItemType;
  parent?: ItemDetailType;
  type: ItemTypeEnum;
}

export interface ItemType {
  [key: string]: ItemType | ItemDetailType;
}
