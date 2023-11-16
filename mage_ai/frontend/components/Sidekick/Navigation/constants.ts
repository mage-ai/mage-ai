import PipelineType from '@interfaces/PipelineType';
import ProjectType from '@interfaces/ProjectType';
import { GLOBAL_VARIABLES_UUID } from '@interfaces/PipelineVariableType';
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
  project,
  secrets,
  setActiveSidekickView,
  variables,
}: {
  activeView: ViewKeyEnum;
  pipeline?: PipelineType;
  project?: ProjectType;
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
  const vars = getFormattedVariables(variables, (block) => block.uuid === GLOBAL_VARIABLES_UUID);

  return SIDEKICK_VIEWS({
    pipeline,
    project,
  }).map(({
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
