import { ItemClickHandler, MenuGroupType } from '@mana/components/Menu/interfaces';
import { MenuItemType } from '@mana/hooks/useContextMenu';

export interface HeaderProps {
  appHistory?: any[];
  buildInterAppNavItems?: (
    itemsPrevious: any[],
    opts: {
      router: any;
    },
  ) => any[];
  buildIntraAppNavItems?: (
    onClick: any,
    opts?: {
      includeChildren?: boolean;
    },
  ) => any[];
  cacheKey?: string;
  globalNavItems?: any[];
  interAppNavItems?: any[];
  intraAppNavItems?: any[];
  navTag?: string;
  router?: any;
  selectedIntraAppNavItems?: any[];
  selectedNavItem?: string;
  title?: string;
  version?: number;
}
