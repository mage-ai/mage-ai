export const VARIABLE_NAME_BUCKETS = 'buckets';
export const VARIABLE_NAME_CHART_STYLE = 'chart_style';
export const VARIABLE_NAME_X = 'x';
export const VARIABLE_NAME_Y = 'y';

export const VARIABLE_NAMES = [
  VARIABLE_NAME_X,
  VARIABLE_NAME_Y,
];

export enum ChartTypeEnum {
  BAR_CHART = 'bar chart',
  HISTOGRAM = 'histogram',
  PIE_CHART = 'pie chart',
}

export enum ChartStyleEnum {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}

export interface ConfigurationType {
  [VARIABLE_NAME_BUCKETS]?: number;
  [VARIABLE_NAME_CHART_STYLE]?: ChartStyleEnum;
  [VARIABLE_NAME_X]?: string[] | number[];
  [VARIABLE_NAME_Y]?: string[] | number[];
  chart_type?: ChartTypeEnum;
  width_percentage?: number;
}

export const CHART_TYPES = [
  ChartTypeEnum.BAR_CHART,
  ChartTypeEnum.HISTOGRAM,
  ChartTypeEnum.PIE_CHART,
];
