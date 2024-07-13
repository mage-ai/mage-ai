import { ClientEventType, FileType } from '../../shared/interfaces';
import { CustomEvent } from '../../events/interfaces';
import { ItemTypeEnum } from './types';
import { KeyboardTextGroupType } from '../../elements/Text/Keyboard/types';

export type ItemClickHandler = (
  event: MouseEvent,
  group?: MenuGroupType,
  handleGroupSelection?: (event: MouseEvent, groups: MenuGroupType[]) => void,
) => void;

export interface ItemDetailType extends FileType {
  items?: ItemType;
  parent?: ItemDetailType;
  type: ItemTypeEnum;
}

export interface ItemType {
  [key: string]: ItemType | ItemDetailType;
}

export interface MenuItemType {
  Icon?: ({ ...props }: any) => any;
  description?: (() => string) | string;
  divider?: boolean;
  items?: MenuItemType[];
  keyboardShortcuts?: KeyboardTextGroupType;
  label?: (() => string) | string;
  onClick?: (event?: ClientEventType | CustomEvent, item?: MenuItemType, callback?: () => void) => void;
  uuid?: string;
}

export interface MenuGroupType extends MenuItemType {
  groups?: MenuGroupType[];
  index?: number;
  level: number;
  uuid?: string;
}
