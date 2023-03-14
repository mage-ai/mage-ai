import {
  Alphabet,
  Code,
  Lightning,
  NavData,
  NavGraph,
  NavReport,
  NavTree,
  Terminal,
} from '@oracle/icons';
import { indexBy } from '@utils/array';

export const VIEW_QUERY_PARAM = 'sideview';
export const VH_PERCENTAGE = 90;

export enum ViewKeyEnum {
  CHARTS = 'charts',
  DATA = 'data',
  EXTENSIONS = 'power_ups',
  FILE_VERSIONS = 'file_versions',
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
  ViewKeyEnum.EXTENSIONS,
  ViewKeyEnum.REPORTS,
  ViewKeyEnum.TREE,
];

export const MESSAGE_VIEWS = [
  ViewKeyEnum.DATA,
  ViewKeyEnum.REPORTS,
  ViewKeyEnum.GRAPHS,
];

export const SIDEKICK_VIEWS: {
  key: ViewKeyEnum;
  label: string;
}[] = [
  {
    key: ViewKeyEnum.TREE,
    label: 'Tree',
  },
  {
    key: ViewKeyEnum.CHARTS,
    label: 'Charts',
  },
  {
    key: ViewKeyEnum.VARIABLES,
    label: 'Variables',
  },
  {
    key: ViewKeyEnum.SECRETS,
    label: 'Secrets',
  },
  {
    key: ViewKeyEnum.EXTENSIONS,
    label: 'Power ups',
  },
  {
    key: ViewKeyEnum.DATA,
    label: 'Data',
  },
  {
    key: ViewKeyEnum.TERMINAL,
    label: 'Terminal',
  },
  // { key: ViewKeyEnum.REPORTS, label: 'Reports' },
  // { key: ViewKeyEnum.GRAPHS, label: 'Graphs' },
];

export const SIDEKICK_VIEWS_BY_KEY = indexBy(SIDEKICK_VIEWS, ({ key }) => key);

export const NAV_ICON_MAPPING = {
  [ViewKeyEnum.CHARTS]: NavGraph,
  [ViewKeyEnum.DATA]: NavData,
  [ViewKeyEnum.EXTENSIONS]: Lightning,
  [ViewKeyEnum.GRAPHS]: NavGraph,
  [ViewKeyEnum.REPORTS]: NavReport,
  [ViewKeyEnum.SECRETS]: Code,
  [ViewKeyEnum.TERMINAL]: Terminal,
  [ViewKeyEnum.TREE]: NavTree,
  [ViewKeyEnum.VARIABLES]: Alphabet,
};
