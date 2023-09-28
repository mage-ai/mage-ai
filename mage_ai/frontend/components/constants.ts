import {
  Alphabet,
  Binary,
  CalendarDate,
  Category,
  Categories,
  Email,
  IDLetters,
  List,
  MapPin,
  NumberHash,
  NumberWithDecimalHash,
  Phone,
} from '@oracle/icons';
import { ColumnTypeEnum } from '@interfaces/FeatureType';
import { UNIT } from '@oracle/styles/units/spacing';

export const HEADER_HEIGHT_UNITS = 7;
export const HEADER_HEIGHT = UNIT * HEADER_HEIGHT_UNITS;
export const HEADER_Z_INDEX = 22;
export const MARGIN_TOP_HEIGHT_UNITS = 5;
export const MARGIN_TOP_HEIGHT = UNIT * MARGIN_TOP_HEIGHT_UNITS;
export const SUBHEADER_Z_INDEX = 21;
export const SUBHEADER_TOOLBAR_HEIGHT_UNITS = 5;
export const SUBHEADER_TOOLBAR_HEIGHT = UNIT * SUBHEADER_TOOLBAR_HEIGHT_UNITS;

export const COLUMN_TYPE_ICON_MAPPING = {
  [ColumnTypeEnum.CATEGORY]: Category,
  [ColumnTypeEnum.CATEGORY_HIGH_CARDINALITY]: Categories,
  [ColumnTypeEnum.DATETIME]: CalendarDate,
  [ColumnTypeEnum.EMAIL]: Email,
  [ColumnTypeEnum.LIST]: List,
  [ColumnTypeEnum.NUMBER]: NumberHash,
  [ColumnTypeEnum.NUMBER_WITH_DECIMALS]: NumberWithDecimalHash,
  [ColumnTypeEnum.PHONE_NUMBER]: Phone,
  [ColumnTypeEnum.TEXT]: Alphabet,
  [ColumnTypeEnum.TRUE_OR_FALSE]: Binary,
  [ColumnTypeEnum.UUID]: IDLetters,
  [ColumnTypeEnum.ZIP_CODE]: MapPin,
};
