import BlockType from '@interfaces/BlockType';
import {  } from '@interfaces/ChartBlockType';
import {
  ChartStyleEnum,
  ChartTypeEnum,
  SortOrderEnum,
  VARIABLE_NAME_BUCKETS,
  VARIABLE_NAME_CHART_STYLE,
  VARIABLE_NAME_X,
  VARIABLE_NAME_Y,
  VARIABLE_NAME_Y_SORT_ORDER,
} from '@interfaces/ChartBlockType';

export const CONFIGURATIONS_BY_CHART_TYPE = {
  [ChartTypeEnum.BAR_CHART]: [
    {
      label: () => 'variable name of x-axis',
      monospace: true,
      uuid: VARIABLE_NAME_X,
    },
    {
      label: () => 'variable name of y-axis',
      monospace: true,
      uuid: VARIABLE_NAME_Y,
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
    content: ({
      upstream_blocks: upstreamBlocks = [],
    }: BlockType) => {
      const uuid = upstreamBlocks[0];

      return `columns = ${uuid}.columns
x = ${uuid}.columns[:7]
y = [len(${uuid}[col].unique()) for col in x]
`;
    },
  },
  [ChartTypeEnum.HISTOGRAM]: {
    configuration: (block: BlockType) => ({
      [VARIABLE_NAME_BUCKETS]: 10,
      [VARIABLE_NAME_X]: 'x',
    }),
    content: ({
      upstream_blocks: upstreamBlocks = [],
    }: BlockType) => {
      const uuid = upstreamBlocks[0];

      return `columns = ${uuid}.columns
col = list(filter(lambda x: ${uuid}[x].dtype == float or ${uuid}[x].dtype == int, columns))[0]
x = ${uuid}[col]
`;
    },
  },
  [ChartTypeEnum.PIE_CHART]: {
    configuration: (block: BlockType) => ({
      [VARIABLE_NAME_BUCKETS]: 7,
      [VARIABLE_NAME_X]: 'x',
    }),
    content: ({
      upstream_blocks: upstreamBlocks = [],
    }: BlockType) => {
      const uuid = upstreamBlocks[0];

      return `x = ${uuid}[${uuid}.columns[0]]`;
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
  [ChartTypeEnum.PIE_CHART]: {
    [VARIABLE_NAME_X]: (): string => 'must be a list of booleans, dates, integers, floats, or strings.',
  },
};
