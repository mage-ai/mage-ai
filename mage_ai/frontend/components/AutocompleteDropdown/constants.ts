import KeyboardShortcutType from '@interfaces/KeyboardShortcutType';

export interface ItemType {
  itemObject?: any;
  keyboardShortcutValidation?: (ks: KeyboardShortcutType, index?: number) => boolean;
  searchQueries: string[];
  value: any;
}

export type RenderItemProps = {
  highlighted: boolean;
  onClick?: (event: any) => void;
  onMouseEnter?: (event: any) => void;
  onMouseLeave?: (event: any) => void;
};

export interface ItemGroupType {
  items: ItemType[];
  renderGroupHeader?: () => any;
  renderItem: (
    item: ItemType,
    opts: RenderItemProps,
    index: number,
    indexFlattened: number,
  ) => any;
  uuid?: string;
}
