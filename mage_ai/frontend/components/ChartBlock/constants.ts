import BlockType from '@interfaces/BlockType';
import {  } from '@interfaces/ChartBlockType';
import {
  ChartStyleEnum,
  ChartTypeEnum,
  SortOrderEnum,
  VARIABLE_NAME_BUCKETS,
  VARIABLE_NAME_CHART_STYLE,
  VARIABLE_NAME_LEGEND_LABELS,
  VARIABLE_NAME_LIMIT,
  VARIABLE_NAME_X,
  VARIABLE_NAME_Y,
  VARIABLE_NAME_Y_SORT_ORDER,
} from '@interfaces/ChartBlockType';

export const CONFIGURATIONS_BY_CHART_TYPE = {
  [ChartTypeEnum.BAR_CHART]: [
    {
      label: () => 'variable name of x-axis values',
      monospace: true,
      uuid: VARIABLE_NAME_X,
      disableAutoRun: true,
    },
    {
      label: () => 'variable name of y-axis values',
      monospace: true,
      uuid: VARIABLE_NAME_Y,
      disableAutoRun: true,
    },
    {
      label: () => 'y-axis sort direction',
      options: [
        null,
        SortOrderEnum.ASCENDING,
        SortOrderEnum.DESCENDING,
      ],
      uuid: VARIABLE_NAME_Y_SORT_ORDER,
    },
    {
      label: () => 'chart style',
      options: [
        ChartStyleEnum.HORIZONTAL,
        ChartStyleEnum.VERTICAL,
      ],
      uuid: VARIABLE_NAME_CHART_STYLE,
    },
  ],
  [ChartTypeEnum.HISTOGRAM]: [
    {
      label: () => 'Number of buckets',
      type: 'number',
      uuid: VARIABLE_NAME_BUCKETS,
    },
    {
      label: () => 'variable name of values',
      monospace: true,
      uuid: VARIABLE_NAME_X,
      disableAutoRun: true,
    },
  ],
  [ChartTypeEnum.LINE_CHART]: [
    {
      label: () => 'variable name of x-axis values',
      monospace: true,
      uuid: VARIABLE_NAME_X,
      disableAutoRun: true,
    },
    {
      label: () => 'variable name of y-axis values',
      monospace: true,
      uuid: VARIABLE_NAME_Y,
      disableAutoRun: true,
    },
    {
      label: () => 'labels of lines in chart (comma separated)',
      uuid: VARIABLE_NAME_LEGEND_LABELS,
      disableAutoRun: true,
    },
  ],
  [ChartTypeEnum.PIE_CHART]: [
    {
      label: () => 'Number of slices',
      type: 'number',
      uuid: VARIABLE_NAME_BUCKETS,
    },
    {
      label: () => 'variable name of values',
      monospace: true,
      uuid: VARIABLE_NAME_X,
      disableAutoRun: true,
    },
  ],
  [ChartTypeEnum.TABLE]: [
    {
      label: () => 'variable name of columns',
      monospace: true,
      uuid: VARIABLE_NAME_X,
      disableAutoRun: true,
    },
    {
      label: () => 'variable name of rows',
      monospace: true,
      uuid: VARIABLE_NAME_Y,
      disableAutoRun: true,
    },
    {
      label: () => 'max number of rows',
      type: 'number',
      uuid: VARIABLE_NAME_LIMIT,
    },
  ],
};

export const DEFAULT_SETTINGS_BY_CHART_TYPE = {
  [ChartTypeEnum.BAR_CHART]: {
    configuration: (block: BlockType) => ({
      [VARIABLE_NAME_X]: 'x',
      [VARIABLE_NAME_Y]: 'y',
      [VARIABLE_NAME_CHART_STYLE]: ChartStyleEnum.VERTICAL,
    }),
    content: (block: BlockType) => {
      return `columns = df_1.columns
x = df_1.columns[:7]
y = [len(df_1[col].unique()) for col in x]
`;
    },
  },
  [ChartTypeEnum.HISTOGRAM]: {
    configuration: (block: BlockType) => ({
      [VARIABLE_NAME_BUCKETS]: 10,
      [VARIABLE_NAME_X]: 'x',
    }),
    content: (block: BlockType) => {
      return `columns = df_1.columns
col = list(filter(lambda x: df_1[x].dtype == float or df_1[x].dtype == int, columns))[0]
x = df_1[col]
`;
    },
  },
  [ChartTypeEnum.LINE_CHART]: {
    configuration: (block: BlockType) => ({
      [VARIABLE_NAME_X]: 'x',
      [VARIABLE_NAME_Y]: 'y',
    }),
    content: (block: BlockType) => {
      return `columns = df_1.columns
cols = list(filter(lambda x: df_1[x].dtype == float or df_1[x].dtype == int, columns))
x = df_1[cols[0]]
y = [df_1[cols[1]]]
`;
    },
  },
  [ChartTypeEnum.PIE_CHART]: {
    configuration: (block: BlockType) => ({
      [VARIABLE_NAME_BUCKETS]: 7,
      [VARIABLE_NAME_X]: 'x',
    }),
    content: (block: BlockType) => {
      return `x = df_1[df_1.columns[0]]`;
    },
  },
  [ChartTypeEnum.TABLE]: {
    configuration: (block: BlockType) => ({
      [VARIABLE_NAME_LIMIT]: 10,
      [VARIABLE_NAME_X]: 'x',
      [VARIABLE_NAME_Y]: 'y',
    }),
    content: (block: BlockType) => {
      return `x = df_1.columns
y = df_1.to_numpy()`;
    },
  },
};

export const VARIABLE_INFO_BY_CHART_TYPE = {
  [ChartTypeEnum.BAR_CHART]: {
    [VARIABLE_NAME_X]: (): string => 'must be a list of booleans, dates, integers, floats, or strings.',
    [VARIABLE_NAME_Y]: (): string => 'must be a list of integers or floats.',
  },
  [ChartTypeEnum.HISTOGRAM]: {
    [VARIABLE_NAME_X]: (): string => 'must be a list of integers or floats.',
  },
  [ChartTypeEnum.LINE_CHART]: {
    [VARIABLE_NAME_X]: (): string => 'must be a list of integers or floats.',
    [VARIABLE_NAME_Y]: (): string => 'must be a list of lists containing integers or floats. ' +
      'Each list is a single line in the chart.',
  },
  [ChartTypeEnum.PIE_CHART]: {
    [VARIABLE_NAME_X]: (): string => 'must be a list of booleans, dates, integers, floats, or strings.',
  },
  [ChartTypeEnum.TABLE]: {
    [VARIABLE_NAME_X]: (): string => 'must be a list of strings.',
    [VARIABLE_NAME_Y]: (): string => 'must be a list of lists containing booleans, dates, integers, floats, or strings.',
  },
};
