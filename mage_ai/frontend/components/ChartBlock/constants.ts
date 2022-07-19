import { ChartTypeEnum } from '@interfaces/BlockType';

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
      uuid: 'x',
    },
  ],
};
