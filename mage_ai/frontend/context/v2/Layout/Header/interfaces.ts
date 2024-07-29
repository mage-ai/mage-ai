import  { SearchAppType } from './SearchApplication';
import { RouteType } from '@mana/shared/interfaces';
import { SetThemeSettingsType } from '@mana/themes/interfaces';

export interface HeaderProps {
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
  routeHistory?: RouteType[];
  router?: any;
  searchApp?: SearchAppType;
  selectedIntraAppNavItems?: any[];
  selectedNavItem?: string;
  title?: string;
  updateThemeSettings?: SetThemeSettingsType;
  uuid?: string;
  version?: number;
}
