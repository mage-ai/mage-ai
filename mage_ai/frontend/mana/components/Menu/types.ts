import { KeyboardTextGroupType } from '@mana/elements/Text/Keyboard/types';

export interface MenuItemType {
  Icon?: ({ ...props }: any) => any;
  description?: () => string;
  divider?: boolean;
  items?: MenuItemType[];
  keyboardShortcuts?: KeyboardTextGroupType;
  label?: () => string;
  onClick?: (event: React.MouseEvent) => void;
  uuid?: string;
}
