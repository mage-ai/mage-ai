import PipelineType from '@interfaces/PipelineType';
import { NavigationItem } from '@components/Dashboard/VerticalNavigation';
import {
  NAV_ICON_MAPPING,
  SIDEKICK_VIEWS,
  ViewKeyEnum,
} from '../constants';
import { getFormattedVariables } from '../utils';

export function buildNavigationItems({
  activeView,
  pipeline,
  secrets,
  setActiveSidekickView,
  variables,
}: {
  activeView: ViewKeyEnum;
  pipeline?: PipelineType;
  secrets?: {
    [key: string]: any;
  }[];
  setActiveSidekickView?: (
    newView: ViewKeyEnum,
    pushHistory?: boolean,
  ) => void;
  variables?: {
    [key: string]: any;
  }[];
}): NavigationItem[] {
  const vars = getFormattedVariables(variables, (block) => block.uuid === 'global');

  return SIDEKICK_VIEWS.map(({
    buildLabel,
    key,
    label,
  }) => ({
    Icon: NAV_ICON_MAPPING[key],
    id: key,
    isSelected: () => activeView === key,
    label: () => buildLabel?.({
      pipeline,
      secrets,
      variables: vars,
    }) || label,
    onClick: () => setActiveSidekickView(key, true),
  }));
}
