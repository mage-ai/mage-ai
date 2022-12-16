import {
  ColumnTypeEnum,
} from '@interfaces/FeatureType';
import {
  CODE_EXAMPLE,
  FEATURE_ATTRIBUTE_COLUMN_TYPE as COLUMN_TYPE,
  FormConfigType,
  OPERATOR_CONTAINS as CONTAINS,
  OPERATOR_EQUAL as EQUAL,
  VALUES_TYPE_COLUMNS as COLUMNS,
  VALUES_TYPE_USER_INPUT as USER_INPUT,
} from './constants';

const columns: {
  [key: string]: FormConfigType;
} = {
  clean_column_name: {
    multiColumns: true,
    title: 'Clean column name',
    description: 'Lowercase the column name and replace special characters with an underscore.',
  },
  custom: {
    title: 'Custom code',
    description: 'Write your own custom cleaning function. \
      Add @transformer_action, then begin typing Python code inside a function. \
      You may refer to the current dataset as df.',
    code: {
      default: CODE_EXAMPLE,
      multiline: true,
      values: USER_INPUT,
    },
  },
  fix_syntax_errors: {
    multiColumns: true,
    title: 'Fix syntax errors',
    description: 'Fix syntactical errors to reduce the amount of noise in the data.',
  },
  impute: {
    multiColumns: true,
    title: 'Impute',
    description: 'Fill in missing values.',
    options: {
      strategy: {
        description: 'Select how you want missing values to be filled in.',
        values: [
          {
            description: 'Mean value',
            condition: {
              feature_attribute: COLUMN_TYPE,
              operator: CONTAINS,
              value: [
                ColumnTypeEnum.NUMBER,
                ColumnTypeEnum.NUMBER_WITH_DECIMALS,
              ],
            },
            value: 'average',
          },
          {
            description: 'Median value',
            condition: {
              feature_attribute: COLUMN_TYPE,
              operator: CONTAINS,
              value: [
                ColumnTypeEnum.NUMBER,
                ColumnTypeEnum.NUMBER_WITH_DECIMALS,
              ],
            },
            value: 'median',
          },
          {
            description: 'Most frequent value',
            value: 'mode',
          },
          {
            description: 'Use previously occurring entry in a timeseries',
            value: 'seq',
          },
          {
            description: 'Random value',
            value: 'random',
          },
          {
            description: 'Use a single value',
            value: 'constant',
          },
        ],
      },
      value: {
        description: 'Use a constant value to fill in missing values.',
        condition: {
          options_key: 'strategy',
          operator: EQUAL,
          value: 'constant',
        },
        values: USER_INPUT,
      },
    },
  },
  remove: {
    multiColumns: true,
    title: 'Remove column',
    description: 'Drop 1 or more columns from the dataset.',
  },
  reformat: {
    multiColumns: true,
    title: 'Reformat values',
    description: 'Change the format of values to a consistent format.',
    options: {
      reformat: {
        values: [
          {
            description: 'Capitalize all the values using lowercase or uppercase.',
            value: 'caps_standardization',
          },
          {
            description: 'Remove currency symbols and convert strings into numbers.',
            value: 'currency_to_num',
          },
          {
            description: 'Reformat the date and time to ISO format (YYYY-MM-DD HH:mm:SS).',
            value: 'date_format_conversion',
          },
        ],
      },
      capitalization: {
        condition: {
          options_key: 'reformat',
          operator: EQUAL,
          value: 'caps_standardization',
        },
        values: [
          {
            value: 'lowercase',
          },
          {
            value: 'uppercase',
          },
        ],
      },
    },
  },
  remove_outliers: {
    multiColumns: true,
    title: 'Remove outliers',
    description: 'Remove rows with outliers to reduce noise in the data.',
    options: {
      method: {
        values: [
          {
            value: 'lof',
            description: 'Use the Local Outlier Factor algorithm',
          },
          {
            value: 'itree',
            description: 'Use the Isolation Forest algorithm',
          },
          {
            value: 'auto',
            description: 'Choose the best method automatically',
          },
        ],
      },
    },
  },
};

const rows: {
  [key: string]: FormConfigType;
} = {
  custom: {
    title: 'Custom code',
    description: 'Write your own custom cleaning function. \
      Add @transformer_action, then begin typing Python code inside a function. \
      You may refer to the current dataset as df.',
    code: {
      default: CODE_EXAMPLE,
      multiline: true,
      values: USER_INPUT,
    },
  },
  drop_duplicate: {
    title: 'Drop duplicates',
    description: 'Remove rows that have repeat values from 1 or more columns.',
    arguments: {
      description: 'Select 1 or more columns that should have unique values.',
      values: COLUMNS,
    },
    options: {
      keep: {
        description: 'When duplicate rows are found, decide which row to keep.',
        values: [
          {
            value: 'first',
          },
          {
            value: 'last',
          },
        ]
      },
    },
  },
  filter: {
    title: 'Filter',
    description: 'Select which rows to keep. Use Python syntax for conditional statements. For example: col1 == 1 and (col2 == 3 or col3 is None)',
    code: {
      values: USER_INPUT,
    },
  },
};

export default {
  columns,
  rows,
};
