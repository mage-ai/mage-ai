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
      uuid: 'buckets',
    },
    {
      label: () => 'variable name of values',
      monospace: true,
      uuid: VARIABLE_NAME_X,
    },
  ],
};

export const VARIABLE_INFO_BY_CHART_TYPE = {
  [ChartTypeEnum.HISTOGRAM]: {
    [VARIABLE_NAME_X]: (): string => 'must be a list of integers or floats.',
  },
};
