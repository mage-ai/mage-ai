import { NavigationItem } from '@components/Dashboard/VerticalNavigation';
import {
  NAV_ICON_MAPPING,
  SIDEKICK_VIEWS,
  VIEW_QUERY_PARAM,
  ViewKeyEnum,
} from '@components/Sidekick/constants';

export function buildNavigationItems({
  activeView,
  pipelineUUID,
}: {
  activeView: ViewKeyEnum;
  pipelineUUID: string;
  setActiveSidekickView?: (
    newView: ViewKeyEnum,
    pushHistory?: boolean,
  ) => void;
}): NavigationItem[] {
  return SIDEKICK_VIEWS.map(({
    key,
    label,
  }) => ({
    Icon: NAV_ICON_MAPPING[key],
    id: key,
    isSelected: () => activeView === key,
    label: () => label,
    linkProps: {
      as: `/pipelines/${pipelineUUID}/edit?${VIEW_QUERY_PARAM}=${key}`,
      href: '/pipelines/[pipeline]/edit',
    },
  }));
}
