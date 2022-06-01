import {
  COLUMN_TYPE_NUMBER,
  COLUMN_TYPE_NUMBER_WITH_DECIMALS,
} from '@interfaces/FeatureType';
import {
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
    description: 'TBD',
  },
  impute: {
    title: 'Impute',
    description: 'Fill in missing values.',
    options: {
      strategy: {
        description: 'Select how you want missing values to be filled in.',
        values: [
          {
            description: 'TBD',
            condition: {
              feature_attribute: COLUMN_TYPE,
              operator: CONTAINS,
              value: [
                COLUMN_TYPE_NUMBER,
                COLUMN_TYPE_NUMBER_WITH_DECIMALS,
              ],
            },
            value: 'average',
          },
          {
            description: 'TBD',
            condition: {
              feature_attribute: COLUMN_TYPE,
              operator: CONTAINS,
              value: [
                COLUMN_TYPE_NUMBER,
                COLUMN_TYPE_NUMBER_WITH_DECIMALS,
              ],
            },
            value: 'median',
          },
          {
            description: 'TBD',
            value: 'mode',
          },
          {
            description: 'TBD',
            value: 'seq',
          },
          {
            description: 'TBD',
            value: 'random',
          },
          {
            description: 'TBD',
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
    description: 'TBD',
  },
  reformat: {
    multiColumns: true,
    title: 'Reformat values',
    description: 'TBD',
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
            description: 'TBD',
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
};

const rows: {
  [key: string]: FormConfigType;
} = {
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
    description: 'TBD',
    code: {
      values: USER_INPUT,
    },
  },
};

export default {
  columns,
  rows,
};
