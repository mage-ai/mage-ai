export enum ColumnTypeEnum {
  CATEGORY = 'category',
  CATEGORY_HIGH_CARDINALITY = 'category_high_cardinality',
  DATETIME = 'datetime',
  EMAIL = 'email',
  LIST = 'list',
  NUMBER = 'number',
  NUMBER_WITH_DECIMALS = 'number_with_decimals',
  PHONE_NUMBER = 'phone_number',
  TEXT = 'text',
  TRUE_OR_FALSE = 'true_or_false',
  UUID = 'uuid',
  ZIP_CODE = 'zip_code',
}

export const COLUMN_TYPE_NUMBERS = [
  ColumnTypeEnum.NUMBER,
  ColumnTypeEnum.NUMBER_WITH_DECIMALS,
];

export const COLUMN_TYPE_NUMBERICAL_LIKE = [
  ColumnTypeEnum.NUMBER,
  ColumnTypeEnum.NUMBER_WITH_DECIMALS,
];

export const COLUMN_TYPE_NUMBERICAL_WITH_DATETIME_LIKE = [
  ColumnTypeEnum.DATETIME,
  ColumnTypeEnum.NUMBER,
  ColumnTypeEnum.NUMBER_WITH_DECIMALS,
];

export const COLUMN_TYPE_WITH_STRINGS = [
  ColumnTypeEnum.CATEGORY,
  ColumnTypeEnum.CATEGORY_HIGH_CARDINALITY,
  ColumnTypeEnum.DATETIME,
  ColumnTypeEnum.EMAIL,
  ColumnTypeEnum.PHONE_NUMBER,
  ColumnTypeEnum.TEXT,
  ColumnTypeEnum.TRUE_OR_FALSE,
];

export const COLUMN_TYPE_STRING_LIKE = [
  ColumnTypeEnum.CATEGORY,
  ColumnTypeEnum.CATEGORY_HIGH_CARDINALITY,
  ColumnTypeEnum.DATETIME,
  ColumnTypeEnum.EMAIL,
  ColumnTypeEnum.PHONE_NUMBER,
  ColumnTypeEnum.TEXT,
];

export const COLUMN_TYPE_CATEGORICAL = [
  ColumnTypeEnum.CATEGORY,
  ColumnTypeEnum.CATEGORY_HIGH_CARDINALITY,
];

export const COLUMN_TYPE_HUMAN_READABLE_MAPPING = {
  [ColumnTypeEnum.NUMBER]: 'Number',
  [ColumnTypeEnum.NUMBER_WITH_DECIMALS]: 'Decimal number',
  [ColumnTypeEnum.CATEGORY]: 'Category',
  [ColumnTypeEnum.CATEGORY_HIGH_CARDINALITY]: 'Category (high cardinality)',
  [ColumnTypeEnum.DATETIME]: 'Date/Time',
  [ColumnTypeEnum.EMAIL]: 'Email',
  [ColumnTypeEnum.LIST]: 'List',
  [ColumnTypeEnum.PHONE_NUMBER]: 'Phone number',
  [ColumnTypeEnum.TEXT]: 'Text',
  [ColumnTypeEnum.TRUE_OR_FALSE]: 'Boolean',
  [ColumnTypeEnum.ZIP_CODE]: 'Zip code',
};

export interface FeatureResponseType {
  column_type?: ColumnTypeEnum;
  uuid: string;
}
export default interface FeatureType {
  columnType: ColumnTypeEnum;
  uuid: string;
}
