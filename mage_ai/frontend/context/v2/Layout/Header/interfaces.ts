import { RouteType } from '@mana/shared/interfaces';

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
  routeHistory?: {
    header: { title: string };
    page: { title: string };
    route: RouteType;
  }[];
  router?: any;
  selectedIntraAppNavItems?: any[];
  selectedNavItem?: string;
  title?: string;
  version?: number;
}
