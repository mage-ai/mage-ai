import {
  Alphabet,
  CalendarDate,
  Category,
  Categories,
  Email,
  IDLetters,
  MapPin,
  NumberHash,
  NumberWithDecimalHash,
  Phone,
  Switch,
} from '@oracle/icons';
import { ColumnTypeEnum } from '@interfaces/FeatureType';

export const COLUMN_TYPE_ICON_MAPPING = {
  [ColumnTypeEnum.CATEGORY]: Category,
  [ColumnTypeEnum.CATEGORY_HIGH_CARDINALITY]: Categories,
  [ColumnTypeEnum.DATETIME]: CalendarDate,
  [ColumnTypeEnum.EMAIL]: Email,
  [ColumnTypeEnum.NUMBER]: NumberHash,
  [ColumnTypeEnum.NUMBER_WITH_DECIMALS]: NumberWithDecimalHash,
  [ColumnTypeEnum.PHONE_NUMBER]: Phone,
  [ColumnTypeEnum.TEXT]: Alphabet,
  [ColumnTypeEnum.TRUE_OR_FALSE]: Switch,
  [ColumnTypeEnum.UUID]: IDLetters,
  [ColumnTypeEnum.ZIP_CODE]: MapPin,
};
