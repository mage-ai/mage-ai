import { ItemTypeEnum } from './enums';
import { LanguageEnum } from '../../../IDE/languages/constants';

export interface ItemDetailType {
  extension?: string;
  content?: string;
  items?: ItemType;
  language?: LanguageEnum;
  modified_timestamp?: number;
  name: string;
  parent?: ItemDetailType;
  path?: string;
  relative_path?: string;
  size: number;
  type: ItemTypeEnum;
}

export interface ItemType {
  [key: string]: ItemType | ItemDetailType;
}
