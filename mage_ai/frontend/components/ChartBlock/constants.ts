import BlockType, { ChartTypeEnum } from '@interfaces/BlockType';

export const VARIABLE_NAME_BUCKETS = 'buckets';
export const VARIABLE_NAME_X = 'x';

export const VARIABLE_NAMES = [
  VARIABLE_NAME_X,
];

export const CONFIGURATIONS_BY_CHART_TYPE = {
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
};

export const DEFAULT_SETTINGS_BY_CHART_TYPE = {
  [ChartTypeEnum.HISTOGRAM]: {
    configuration: () => ({
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
};

export const VARIABLE_INFO_BY_CHART_TYPE = {
  [ChartTypeEnum.HISTOGRAM]: {
    [VARIABLE_NAME_X]: (): string => 'must be a list of integers or floats.',
  },
};
