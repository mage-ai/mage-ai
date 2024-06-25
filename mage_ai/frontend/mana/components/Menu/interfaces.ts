export type ItemClickHandler = (
  event: MouseEvent,
  group?: any,
  handleGroupSelection?: (event: MouseEvent, groups: any[]) => void,
) => void;

export type ItemDetailType = any | {
  items?: any;
  parent?: any;
  type: any;
};

export interface ItemType {
  [key: string]: any | any;
}

export interface MenuItemType {
  Icon?: ({ ...props }: any) => any;
  description?: (() => string) | string;
  disabled?: boolean;
  divider?: boolean;
  italic?: boolean;
  items?: any[];
  keyboardShortcuts?: any;
  label?: (() => string) | string;
  linkProps?: {
    href: string;
    as?: string;
  };
  onClick?: (
    event?: any | any,
    item?: any,
    callback?: () => void,
  ) => void;
  parent?: any;
  uuid?: string;
}

export type MenuGroupType = any | {
  groups?: any[];
  index?: number;
  level: number;
  uuid?: string;
};
