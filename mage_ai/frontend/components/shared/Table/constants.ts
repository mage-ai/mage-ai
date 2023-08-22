import { UNIT } from '@oracle/styles/units/spacing';

export const MENU_WIDTH: number = UNIT * 20;

export enum SortDirectionEnum {
  ASC = 'ascending',
  DESC = 'descending',
}

export enum SortQueryEnum {
  SORT_COL_IDX = 'sort_column_index',
  SORT_DIRECTION = 'sort_direction',
}
