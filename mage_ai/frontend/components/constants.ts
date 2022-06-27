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
