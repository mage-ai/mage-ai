import { NavigationItem } from '@components/Dashboard/VerticalNavigation';
import {
  NAV_ICON_MAPPING,
  SIDEKICK_VIEWS,
  VIEW_QUERY_PARAM,
  ViewKeyEnum,
} from '../constants';

export function buildNavigationItems({
  activeView,
  pipelineUUID,
  setActiveSidekickView,
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
    onClick: () => setActiveSidekickView(key, true),
  }));
}
