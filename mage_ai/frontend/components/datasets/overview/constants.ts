import { ColumnTypeEnum } from '@interfaces/FeatureType';

export const TABS_QUERY_PARAM = 'tabs[]';
export const SHOW_COLUMNS_QUERY_PARAM = 'show_columns';
export const COLUMN_QUERY_PARAM = 'column';

export const TAB_REPORTS = 'Reports';
export const TAB_VISUALIZATIONS = 'Visualizations';
export const TAB_DATA = 'Data';
export const TABS_IN_ORDER = [
  TAB_REPORTS,
  TAB_VISUALIZATIONS,
  TAB_DATA,
];

export const COLUMN_DISTRIBUTION_STATS = {
  [ColumnTypeEnum.EMAIL]: 'domain_distribution',
  [ColumnTypeEnum.TEXT]: 'word_distribution',
  default: 'value_counts',
};
