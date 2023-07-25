import { COLUMN_TYPE_CATEGORICAL, ColumnTypeEnum } from '@interfaces/FeatureType';
import { greaterThan, lessThan } from '@utils/array';

export const LARGE_WINDOW_WIDTH = 992;

export const METRICS_KEYS = [
  'duplicate_row_count',
  'completeness',
  'total_invalid_value_count',
  'total_null_value_count',
  'validity',
];

export const STAT_KEYS = [
  'count',
  'empty_column_count',
];

export const WARN_KEYS = [
  'empty_column_count',
  'empty_row_count',
];


export const CATEGORICAL_TYPES = ['category', 'category_high_cardinality', 'true_or_false'];
export const DATE_TYPES = ['datetime'];
export const NUMBER_TYPES = ['number', 'number_with_decimals'];
export const STRING_TYPES = ['email', 'phone_number', 'text', 'zip_code'];

export const PERCENTAGE_KEYS = ['completeness', 'validity'];

export const HUMAN_READABLE_MAPPING = {
  completeness: 'Completeness',
  count: 'Row count',
  duplicate_row_count: 'Duplicate rows',
  empty_column_count: 'Empty columns',
  total_invalid_value_count: 'Invalid cells',
  total_null_value_count: 'Missing cells',
  validity: 'Validity',
};

export const METRICS_SORTED_MAPPING = {
  completeness: 1,
  duplicate_row_count: 4,
  total_invalid_value_count: 3,
  total_null_value_count: 2,
  validity: 0,
};

export const METRICS_RATE_KEY_MAPPING = {
  duplicate_row_count: 'duplicate_row_rate',
  total_invalid_value_count: 'total_invalid_value_rate',
  total_null_value_count: 'total_null_value_rate',
};

export const METRICS_WARNING_MAPPING = {
  completeness: {
    compare: lessThan,
    val: 0.8,
  },
  duplicate_row_count: {
    compare: greaterThan,
    val: 0,
  },
  empty_column_count: {
    compare: greaterThan,
    val: 0,
  },
  total_invalid_value_count: {
    compare: greaterThan,
    val: 0,
  },
  total_null_value_count: {
    compare: greaterThan,
    val: 0,
  },
  validity: {
    compare: lessThan,
    val: 0.8,
  },
};

export const WARNINGS = {
  qualityMetrics: [
    {
      compare: lessThan,
      name: 'Validity',
      val: 80,
    },
    {
      compare: lessThan,
      name: 'Completeness',
      val: 80,
    },
    {
      compare: greaterThan,
      name: 'Duplicate rows',
      val: 0,
    },
  ],
  statistics: [
    {
      compare: greaterThan,
      name: 'Empty columns',
      val: 0,
    },
  ],
};

export const DISTRIBUTION_STATS = {
  [ColumnTypeEnum.EMAIL]: 'domain_distribution',
  [ColumnTypeEnum.TEXT]: 'word_distribution',
  [ColumnTypeEnum.LIST]: 'element_distribution',
  default: 'value_counts',
};

export const DISTRIBUTION_COLUMNS = [
  ...COLUMN_TYPE_CATEGORICAL,
  ColumnTypeEnum.TEXT,
  ColumnTypeEnum.EMAIL,
  ColumnTypeEnum.LIST,
];

export const DISTRIBUTION_TITLES = {
  [ColumnTypeEnum.EMAIL]: 'Domain distribution',
  [ColumnTypeEnum.TEXT]: 'Word distribution',
  [ColumnTypeEnum.LIST]: 'Element distribution',
  default: 'Distribution of values',
};
