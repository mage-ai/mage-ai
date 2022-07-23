export const VARIABLE_NAME_BUCKETS = 'buckets';
export const VARIABLE_NAME_CHART_STYLE = 'chart_style';
export const VARIABLE_NAME_LEGEND_LABELS = 'legend_labels';
export const VARIABLE_NAME_LIMIT = 'limit';
export const VARIABLE_NAME_WIDTH_PERCENTAGE = 'width_percentage';
export const VARIABLE_NAME_X = 'x';
export const VARIABLE_NAME_Y = 'y';
export const VARIABLE_NAME_Y_SORT_ORDER = 'y_sort_order';

export const VARIABLE_NAMES = [
  VARIABLE_NAME_X,
  VARIABLE_NAME_Y,
];

export enum ChartTypeEnum {
  BAR_CHART = 'bar chart',
  HISTOGRAM = 'histogram',
  LINE_CHART = 'line chart',
  PIE_CHART = 'pie chart',
  TABLE = 'table',
}

export enum ChartStyleEnum {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}

export enum SortOrderEnum {
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
}

export interface ConfigurationType {
  [VARIABLE_NAME_BUCKETS]?: number;
  [VARIABLE_NAME_CHART_STYLE]?: ChartStyleEnum;
  [VARIABLE_NAME_LEGEND_LABELS]?: string;
  [VARIABLE_NAME_LIMIT]?: number;
  [VARIABLE_NAME_WIDTH_PERCENTAGE]?: number;
  [VARIABLE_NAME_X]?: string[] | number[];
  [VARIABLE_NAME_Y]?: string[] | number[];
  [VARIABLE_NAME_Y_SORT_ORDER]?: SortOrderEnum;
  chart_type?: ChartTypeEnum;
}

export const CHART_TYPES = [
  ChartTypeEnum.BAR_CHART,
  ChartTypeEnum.HISTOGRAM,
  ChartTypeEnum.LINE_CHART,
  ChartTypeEnum.PIE_CHART,
  ChartTypeEnum.TABLE,
];
