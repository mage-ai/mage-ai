import { ItemTypeEnum } from './enums';

export interface ItemDetailType {
  items?: ItemType;
  name: string;
  parent?: ItemDetailType;
  size: number;
  type: ItemTypeEnum;
}

export interface ItemType {
  [key: string]: ItemType | ItemDetailType;
}
