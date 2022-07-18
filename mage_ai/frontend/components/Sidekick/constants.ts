import {
  Alphabet,
  NavData,
  NavGraph,
  NavReport,
  NavTree,
} from '@oracle/icons';

export const VIEW_QUERY_PARAM = 'sideview';

export enum ViewKeyEnum {
  CHARTS = 'charts',
  DATA = 'data',
  GRAPHS = 'graphs',
  REPORTS = 'reports',
  TREE = 'tree',
  VARIABLES = 'variables',
}

export const FULL_WIDTH_VIEWS = [
  ViewKeyEnum.DATA,
  ViewKeyEnum.REPORTS,
  ViewKeyEnum.TREE,
];

export const MESSAGE_VIEWS = [
  ViewKeyEnum.DATA,
  ViewKeyEnum.REPORTS,
  ViewKeyEnum.GRAPHS,
];

export const SIDEKICK_VIEWS = [
  { key: ViewKeyEnum.TREE, label: 'Tree' },
  { key: ViewKeyEnum.DATA, label: 'Data' },
  { key: ViewKeyEnum.REPORTS, label: 'Reports' },
  { key: ViewKeyEnum.GRAPHS, label: 'Graphs' },
  { key: ViewKeyEnum.VARIABLES, label: 'Variables' },
  // { key: ViewKeyEnum.CHARTS, label: 'Charts' },
];

export const NAV_ICON_MAPPING = {
  [ViewKeyEnum.CHARTS]: NavGraph,
  [ViewKeyEnum.DATA]: NavData,
  [ViewKeyEnum.GRAPHS]: NavGraph,
  [ViewKeyEnum.REPORTS]: NavReport,
  [ViewKeyEnum.TREE]: NavTree,
  [ViewKeyEnum.VARIABLES]: Alphabet,
};
