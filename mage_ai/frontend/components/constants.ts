export const METRICS_KEYS = [
  'avg_null_value_count',
  'avg_invalid_value_count',
  'duplicate_row_count',
  'completeness',
  'validity',
];

export const STAT_KEYS = [
  'count',
  'empty_column_count',
];


export const CATEGORICAL_TYPES = ['category', 'category_high_cardinality', 'true_or_false'];
export const DATE_TYPES = ['datetime'];
export const NUMBER_TYPES = ['number', 'number_with_decimals'];
export const STRING_TYPES = ['email', 'phone_number', 'text', 'zip_code']; // We aren't counting this but good to have.

export const PERCENTAGE_KEYS = ['completeness', 'validity'];

export const HUMAN_READABLE_MAPPING = {
  'avg_invalid_value_count': 'Invalid values',
  'avg_null_value_count': 'Missing values',
  'completeness': 'Completeness',
  'count': 'Row count',
  'duplicate_row_count': 'Duplicate values',
  'empty_column_count': 'Empty features',
  'validity': 'Validity',
};

export const METRICS_SORTED_MAPPING = {
  'avg_invalid_value_count': 3,
  'avg_null_value_count': 2,
  'completeness': 1,
  'duplicate_row_count': 4,
  'validity': 0,
};
