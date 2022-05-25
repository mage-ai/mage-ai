export const COLUMN_TYPE_CATEGORY = 'category';
export const COLUMN_TYPE_CATEGORY_HIGH_CARDINALITY = 'category_high_cardinality';
export const COLUMN_TYPE_DATETIME = 'datetime';
export const COLUMN_TYPE_EMAIL = 'email';
export const COLUMN_TYPE_NUMBER = 'number';
export const COLUMN_TYPE_NUMBER_WITH_DECIMALS = 'number_with_decimals';
export const COLUMN_TYPE_PHONE_NUMBER = 'phone_number';
export const COLUMN_TYPE_TEXT = 'text';
export const COLUMN_TYPE_TRUE_OR_FALSE = 'true_or_false';
export const COLUMN_TYPE_UUID = 'uuid';
export const COLUMN_TYPE_ZIP_CODE = 'zip_code';

export default interface FeatureType {
  column_type: string;
  uuid: string;
}