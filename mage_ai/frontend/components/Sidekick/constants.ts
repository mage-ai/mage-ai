import PipelineType from '@interfaces/PipelineType';
import {
  Callback,
  Charts,
  Lightning,
  NavReport,
  Secrets,
  Settings,
  Table,
  Terminal,
  Tree,
  Variables,
} from '@oracle/icons';
import { indexBy } from '@utils/array';

export const VIEW_QUERY_PARAM = 'sideview';
export const VH_PERCENTAGE = 90;

export enum ViewKeyEnum {
  CALLBACKS = 'callbacks',
  CHARTS = 'charts',
  DATA = 'data',
  EXTENSIONS = 'power_ups',
  FILE_VERSIONS = 'file_versions',
  GRAPHS = 'graphs',
  REPORTS = 'reports',
  SECRETS = 'secrets',
  SETTINGS = 'settings',
  TERMINAL = 'terminal',
  TREE = 'tree',
  VARIABLES = 'variables',
}

export const FULL_WIDTH_VIEWS = [
  ViewKeyEnum.CALLBACKS,
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
  buildLabel?: (opts: {
    pipeline: PipelineType;
    secrets?: {
      [key: string]: any;
    }[];
    variables?: {
      [key: string]: any;
    }[];
  }) => string;
  key: ViewKeyEnum;
  label?: string;
}[] = [
  {
    key: ViewKeyEnum.TREE,
    label: 'Tree',
  },
  {
    buildLabel: ({
      pipeline,
    }) => {
      const { widgets = [] } = pipeline || {};

      if (widgets?.length >= 1) {
        return `Charts (${widgets.length})`;
      }

      return 'Charts';
    },
    key: ViewKeyEnum.CHARTS,
  },
  {
    buildLabel: ({
      variables,
    }) => {
      if (variables?.length >= 1) {
        return `Variables (${variables.length})`;
      }

      return 'Variables';
    },
    key: ViewKeyEnum.VARIABLES,
  },
  {
    buildLabel: ({
      secrets,
    }) => {
      if (secrets?.length >= 1) {
        return `Secrets (${secrets.length})`;
      }

      return 'Secrets';
    },
    key: ViewKeyEnum.SECRETS,
  },
  {
    buildLabel: ({
      pipeline,
    }) => {
      const { callbacks = [] } = pipeline || {};

      if (callbacks?.length >= 1) {
        return `Callbacks (${callbacks.length})`;
      }

      return 'Callbacks';
    },
    key: ViewKeyEnum.CALLBACKS,
  },
  {
    buildLabel: ({
      pipeline,
    }) => {
      const { extensions = {} } = pipeline || {};
      let extensionsCount = 0;
      Object.values(extensions).forEach(({ blocks }) => {
        extensionsCount += blocks?.length || 0;
      });

      if (extensionsCount >= 1) {
        return `Power ups (${extensionsCount})`;
      }

      return 'Power ups';
    },
    key: ViewKeyEnum.EXTENSIONS,
  },
  {
    key: ViewKeyEnum.DATA,
    label: 'Data',
  },
  {
    key: ViewKeyEnum.TERMINAL,
    label: 'Terminal',
  },
  // {
  //   key: ViewKeyEnum.SETTINGS,
  //   label: 'Settings',
  // },
  // { key: ViewKeyEnum.REPORTS, label: 'Reports' },
  // { key: ViewKeyEnum.GRAPHS, label: 'Graphs' },
];

export const SIDEKICK_VIEWS_BY_KEY = indexBy(SIDEKICK_VIEWS, ({ key }) => key);

export const NAV_ICON_MAPPING = {
  [ViewKeyEnum.CALLBACKS]: Callback,
  [ViewKeyEnum.CHARTS]: Charts,
  [ViewKeyEnum.DATA]: Table,
  [ViewKeyEnum.EXTENSIONS]: Lightning,
  [ViewKeyEnum.GRAPHS]: Charts,
  [ViewKeyEnum.REPORTS]: NavReport,
  [ViewKeyEnum.SECRETS]: Secrets,
  [ViewKeyEnum.SETTINGS]: Settings,
  [ViewKeyEnum.TERMINAL]: Terminal,
  [ViewKeyEnum.TREE]: Tree,
  [ViewKeyEnum.VARIABLES]: Variables,
};
