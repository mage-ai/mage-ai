import { ChartTypeEnum } from '@interfaces/BlockType';

export const CONFIGURATIONS_BY_CHART_TYPE = {
  [ChartTypeEnum.HISTOGRAM]: [
    {
      label: () => 'Number of buckets',
      type: 'number',
      uuid: 'buckets',
    },
    {
      label: () => 'x values variable name',
      uuid: 'x',
    },
    {
      label: () => 'y values variable name',
      uuid: 'y',
    },
  ],
};
