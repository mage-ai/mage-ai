import { MenuItemType } from '@mana/hooks/useContextMenu';

export type ItemClickHandler = (event: MouseEvent, opts?: {
  group: MenuItemType;
  index: number;
  item: MenuItemType;
}) => void;

export interface HeaderProps {
  appHistory?: MenuItemType[];
  buildInterAppNavItems?: (itemsPrevious: MenuItemType[], opts: {
    router: any;
  }) => MenuItemType[];
  buildIntraAppNavItems?: (onClick: ItemClickHandler) => MenuItemType[];
  globalNavItems?: MenuItemType[];
  interAppNavItems?: MenuItemType[];
  intraAppNavItems?: MenuItemType[];
  navTag?: string;
  router?: any;
  selectedNavItem?: string;
  title?: string;
  version?: number;
}
