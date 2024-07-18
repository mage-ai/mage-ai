import { ClientEventType, FileType } from '../../shared/interfaces';
import { CustomEvent } from '../../events/interfaces';
import { ItemTypeEnum } from './types';
import { KeyboardTextGroupType } from '../../elements/Text/Keyboard/types';

export type ItemClickHandler = (
  event: MouseEvent,
  group?: any,
  handleGroupSelection?: (event: MouseEvent, groups: any[]) => void,
) => void;

export interface ItemDetailType extends any {
  items?: any;
  parent?: any;
  type: any;
}

export interface ItemType {
  [key: string]: any | any;
}

export interface MenuItemType {
  Icon?: ({ ...props }: any) => any;
  description?: (() => string) | string;
  disabled?: boolean;
  divider?: boolean;
  items?: any[];
  keyboardShortcuts?: any;
  label?: (() => string) | string;
  onClick?: (
    event?: any | any,
    item?: any,
    callback?: () => void,
  ) => void;
  uuid?: string;
}

export interface MenuGroupType extends any {
  groups?: any[];
  index?: number;
  level: number;
  uuid?: string;
}
