import { ItemClickHandler, MenuGroupType } from '@mana/components/Menu/interfaces';
import { MenuItemType } from '@mana/hooks/useContextMenu';

export interface HeaderProps {
  appHistory?: MenuItemType[];
  buildInterAppNavItems?: (
    itemsPrevious: MenuItemType[],
    opts: {
      router: any;
    },
  ) => MenuItemType[];
  buildIntraAppNavItems?: (
    onClick: ItemClickHandler,
    opts?: {
      includeChildren?: boolean;
    },
  ) => MenuItemType[];
  cacheKey?: string;
  globalNavItems?: MenuItemType[];
  interAppNavItems?: MenuItemType[];
  intraAppNavItems?: MenuItemType[];
  navTag?: string;
  router?: any;
  selectedIntraAppNavItems?: MenuGroupType[];
  selectedNavItem?: string;
  title?: string;
  version?: number;
}
