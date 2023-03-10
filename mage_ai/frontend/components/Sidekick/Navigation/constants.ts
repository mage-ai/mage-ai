import { NavigationItem } from '@components/Dashboard/VerticalNavigation';
import {
  NAV_ICON_MAPPING,
  SIDEKICK_VIEWS,
  ViewKeyEnum,
} from '@components/Sidekick/constants';

export function buildNavigationItems({
  activeView,
  setActiveSidekickView,
}: {
  activeView: ViewKeyEnum;
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
    onClick: () => setActiveSidekickView(key),
  }));
}
