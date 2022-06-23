import {
    ColumnTypeEnum,
    COLUMN_TYPE_CATEGORICAL
} from '@interfaces/FeatureType';

export const CORRELATION_THRESHOLD = 0.5;
export const NULL_VALUE_HIGH_THRESHOLD = 0.5;
export const NULL_VALUE_LOW_THRESHOLD = 0.1;
export const UNIQUE_VALUE_HIGH_THRESHOLD = 0.5;
export const UNIQUE_VALUE_LOW_THRESHOLD = 0.05;
export const UNUSUAL_ROW_VOLUME_FACTOR = 1.5;

export const DATE_FORMAT = 'M/D/YYYY';

export const DISTRIBUTION_COLUMNS = [
    ...COLUMN_TYPE_CATEGORICAL,
    ColumnTypeEnum.TEXT,
    ColumnTypeEnum.EMAIL,
];

export const DISTRIBUTION_TITLES = {
    [ColumnTypeEnum.EMAIL]: 'Domain distribution',
    [ColumnTypeEnum.TEXT]: 'Word distribution',
    default: 'Distribution of values',
};
