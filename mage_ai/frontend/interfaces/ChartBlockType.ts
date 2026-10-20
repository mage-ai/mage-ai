import {
  GlobalDataProductOutdatedAfterType,
  GlobalDataProductOutdatedStartingAtType,
} from './GlobalDataProductType';
import { IngestModeEnum } from './DataIntegrationBlockType';

export const VARIABLE_NAME_BUCKETS = 'buckets';
export const VARIABLE_NAME_CHART_STYLE = 'chart_style';
export const VARIABLE_NAME_GROUP_BY = 'group_by';
export const VARIABLE_NAME_ORDER_BY = 'order_by';
export const VARIABLE_NAME_HEIGHT = 'height';
export const VARIABLE_NAME_INDEX = 'index';
export const VARIABLE_NAME_LEGEND_LABELS = 'legend_labels';
export const VARIABLE_NAME_LIMIT = 'limit';
export const VARIABLE_NAME_METRICS = 'metrics';
export const VARIABLE_NAME_TIME_INTERVAL = 'time_interval';
export const VARIABLE_NAME_WIDTH_PERCENTAGE = 'width_percentage';
export const VARIABLE_NAME_X = 'x';
export const VARIABLE_NAME_X_AXIS_LABEL_FORMAT = 'x_axis_label_format';
export const VARIABLE_NAME_X_TOOLTIP_LABEL_FORMAT = 'x_tooltip_label_format';
export const VARIABLE_NAME_Y = 'y';
export const VARIABLE_NAME_Y_AXIS_LABEL_FORMAT = 'y_axis_label_format';
export const VARIABLE_NAME_Y_TOOLTIP_LABEL_FORMAT = 'y_tooltip_label_format';
export const VARIABLE_NAME_Y_SORT_ORDER = 'y_sort_order';
export const VARIABLE_GROUP_NAME_DESIGN = 'design';
export const VARIABLE_GROUP_NAME_DESIGN_X_GRID_LINES_HIDDEN = 'x_grid_lines_hidden';
export const VARIABLE_GROUP_NAME_DESIGN_Y_GRID_LINES_HIDDEN = 'y_grid_lines_hidden';
export const VARIABLE_GROUP_NAME_DESIGN_Y_VALUES_SMOOTH = 'y_values_smooth';

export const CONFIG_KEY_DATA_PROVIDER = 'data_provider';
export const CONFIG_KEY_DATA_PROVIDER_DATABASE = 'data_provider_database';
export const CONFIG_KEY_DATA_PROVIDER_PROFILE = 'data_provider_profile';
export const CONFIG_KEY_DATA_PROVIDER_SCHEMA = 'data_provider_schema';
export const CONFIG_KEY_DATA_PROVIDER_TABLE = 'data_provider_table';
export const CONFIG_KEY_DBT_PROFILE_TARGET = 'dbt_profile_target';
export const CONFIG_KEY_DBT_PROJECT_NAME = 'dbt_project_name';
export const CONFIG_KEY_DBT_PROFILES_FILE_PATH = 'dbt_profiles_file_path';
export const CONFIG_KEY_EXPORT_WRITE_POLICY = 'export_write_policy';
export const CONFIG_KEY_LIMIT = 'limit';
export const CONFIG_KEY_UNIQUE_UPSTREAM_TABLE_NAME = 'unique_upstream_table_name';
export const CONFIG_KEY_UPSTREAM_BLOCK_CONFIGURATION = 'upstream_block_configuration';
export const CONFIG_KEY_UPSTREAM_BLOCK_CONFIGURATION_TABLE_NAME = 'table_name';
export const CONFIG_KEY_USE_RAW_SQL = 'use_raw_sql';
export const CONFIG_KEY_DISABLE_QUERY_PREPROCESSING = 'disable_query_preprocessing';

export const CONFIG_KEY_DBT = 'dbt';
export const CONFIG_KEY_DBT_COMMAND = 'command';

export const VARIABLE_NAMES = [VARIABLE_NAME_X, VARIABLE_NAME_Y];

export enum ChartTypeEnum {
  BAR_CHART = 'bar chart',
  CUSTOM = 'custom',
  HISTOGRAM = 'histogram',
  LINE_CHART = 'line chart',
  PIE_CHART = 'pie chart',
  TABLE = 'table',
  TIME_SERIES_BAR_CHART = 'time series bar chart',
  TIME_SERIES_LINE_CHART = 'time series line chart',
}

export const CHART_TYPES = [
  ChartTypeEnum.BAR_CHART,
  ChartTypeEnum.HISTOGRAM,
  ChartTypeEnum.LINE_CHART,
  ChartTypeEnum.PIE_CHART,
  ChartTypeEnum.TABLE,
  ChartTypeEnum.TIME_SERIES_BAR_CHART,
  ChartTypeEnum.TIME_SERIES_LINE_CHART,
];

export enum ChartStyleEnum {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}

export enum AggregationFunctionEnum {
  AVERAGE = 'average',
  COUNT = 'count',
  COUNT_DISTINCT = 'count_distinct',
  MAX = 'max',
  MEDIAN = 'median',
  MIN = 'min',
  MODE = 'mode',
  SUM = 'sum',
}

export const AGGREGATE_FUNCTIONS = [
  AggregationFunctionEnum.AVERAGE,
  AggregationFunctionEnum.COUNT,
  AggregationFunctionEnum.COUNT_DISTINCT,
  AggregationFunctionEnum.MAX,
  AggregationFunctionEnum.MEDIAN,
  AggregationFunctionEnum.MIN,
  AggregationFunctionEnum.MODE,
  AggregationFunctionEnum.SUM,
];

interface MetricType {
  aggregation: AggregationFunctionEnum;
  column: string;
}

export enum SortOrderEnum {
  ASCENDING = 'ascending',
  DESCENDING = 'descending',
}

export interface ConfigurationDataIntegrationInputType {
  catalog?: boolean;
  input_only?: boolean;
  streams?: string[];
}

export interface ConfigurationDataIntegrationInputsType {
  [block_uuid: string]: ConfigurationDataIntegrationInputType;
}

export interface ConfigurationDataIntegrationType {
  ingest_mode?: {
    [block_uuid: string]: IngestModeEnum;
  };
  inputs?: ConfigurationDataIntegrationInputsType;
}

interface FileSourceType {
  path: string;
  project_path?: string;
}

export interface ConfigurationType {
  [CONFIG_KEY_DATA_PROVIDER]?: string;
  [CONFIG_KEY_DATA_PROVIDER_DATABASE]?: string;
  [CONFIG_KEY_DATA_PROVIDER_PROFILE]?: string;
  [CONFIG_KEY_DATA_PROVIDER_SCHEMA]?: string;
  [CONFIG_KEY_DBT_PROFILE_TARGET]?: string;
  [CONFIG_KEY_DBT_PROJECT_NAME]?: string;
  [VARIABLE_NAME_BUCKETS]?: number;
  [VARIABLE_NAME_CHART_STYLE]?: ChartStyleEnum;
  [VARIABLE_NAME_GROUP_BY]?: string[];
  [VARIABLE_NAME_HEIGHT]?: number;
  [VARIABLE_NAME_INDEX]?: string;
  [VARIABLE_NAME_LEGEND_LABELS]?: string;
  [VARIABLE_NAME_LIMIT]?: number;
  [VARIABLE_NAME_METRICS]?: MetricType[];
  [VARIABLE_NAME_WIDTH_PERCENTAGE]?: number;
  [VARIABLE_NAME_X]?: string;
  [VARIABLE_NAME_Y]?: string;
  [VARIABLE_NAME_Y_SORT_ORDER]?: SortOrderEnum;
  chart_type?: ChartTypeEnum;
  data_integration?: ConfigurationDataIntegrationType;
  dbt?: {
    command?: string;
    disable_tests?: boolean;
  };
  disable_output_preview?: boolean;
  dynamic?: boolean | any;
  file_path?: string;
  file_source?: FileSourceType;
  global_data_product?: {
    outdated_after?: GlobalDataProductOutdatedAfterType;
    outdated_starting_at?: GlobalDataProductOutdatedStartingAtType;
    settings?: {
      [block_uuid: string]: {
        partitions?: number;
      };
    };
    uuid: string;
  };
  reduce_output?: boolean;
  x_axis_label?: string;
}

export function buildMetricName(metric: MetricType) {
  return `${metric.aggregation}(${metric.column})`;
}

export enum TimeIntervalEnum {
  DAY = 'day',
  HOUR = 'hour',
  MINUTE = 'minute',
  MONTH = 'month',
  ORIGINAL = 'original',
  SECOND = 'second',
  WEEK = 'week',
  YEAR = 'year',
}
