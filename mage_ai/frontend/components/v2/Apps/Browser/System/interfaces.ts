import { ItemTypeEnum } from './enums';

export interface ItemDetailType {
  extension?: string;
  items?: ItemType;
  modified_timestamp?: number;
  name: string;
  parent?: ItemDetailType;
  path?: string
  relative_path?: string;
  size: number;
  type: ItemTypeEnum;
}

export interface ItemType {
  [key: string]: ItemType | ItemDetailType;
}
