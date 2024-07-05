import { MenuGroupType } from '@mana/components/Menu/interfaces';
import { MenuItemType } from '@mana/hooks/useContextMenu';

export type ItemClickHandler = (event: MouseEvent, group?: MenuGroupType) => void;

export interface HeaderProps {
  appHistory?: MenuItemType[];
  buildInterAppNavItems?: (itemsPrevious: MenuItemType[], opts: {
    router: any;
  }) => MenuItemType[];
  buildIntraAppNavItems?: (onClick: ItemClickHandler, opts?: {
    includeChildren?: boolean;
  }) => MenuItemType[];
  globalNavItems?: MenuItemType[];
  interAppNavItems?: MenuItemType[];
  intraAppNavItems?: MenuItemType[];
  navTag?: string;
  router?: any;
  selectedNavItem?: string;
  title?: string;
  version?: number;
}
