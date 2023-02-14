import {
  Alphabet,
  Code,
  NavData,
  NavGraph,
  NavReport,
  NavTree,
} from '@oracle/icons';

export const VIEW_QUERY_PARAM = 'sideview';
export const VH_PERCENTAGE = 90;

export enum ViewKeyEnum {
  CHARTS = 'charts',
  DATA = 'data',
  GRAPHS = 'graphs',
  REPORTS = 'reports',
  SECRETS = 'secrets',
  TERMINAL = 'terminal',
  TREE = 'tree',
  VARIABLES = 'variables',
}

export const FULL_WIDTH_VIEWS = [
  ViewKeyEnum.CHARTS,
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
  { key: ViewKeyEnum.CHARTS, label: 'Charts' },
  { key: ViewKeyEnum.VARIABLES, label: 'Variables' },
  { key: ViewKeyEnum.SECRETS, label: 'Secrets' },
  { key: ViewKeyEnum.DATA, label: 'Data' },
  { key: ViewKeyEnum.TERMINAL, label: 'Terminal' },
  // { key: ViewKeyEnum.REPORTS, label: 'Reports' },
  // { key: ViewKeyEnum.GRAPHS, label: 'Graphs' },
];

export const NAV_ICON_MAPPING = {
  [ViewKeyEnum.CHARTS]: NavGraph,
  [ViewKeyEnum.DATA]: NavData,
  [ViewKeyEnum.GRAPHS]: NavGraph,
  [ViewKeyEnum.REPORTS]: NavReport,
  [ViewKeyEnum.SECRETS]: Code,
  [ViewKeyEnum.TREE]: NavTree,
  [ViewKeyEnum.VARIABLES]: Alphabet,
};
