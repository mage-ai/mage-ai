import { LOCAL_TIMEZONE } from '@utils/date';
import { UNIT } from '@oracle/styles/units/spacing';

export const MENU_WIDTH: number = UNIT * 20;
export const DELETE_CONFIRM_WIDTH = UNIT * 40;
export const DELETE_CONFIRM_TOP_OFFSET_DIFF_FIRST = 40;
export const DELETE_CONFIRM_TOP_OFFSET_DIFF = 96;
export const DELETE_CONFIRM_LEFT_OFFSET_DIFF = 286;

export enum SortDirectionEnum {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SortQueryEnum {
  SORT_COL_IDX = 'sort_column_index',
  SORT_DIRECTION = 'sort_direction',
}

export const TIMEZONE_TOOLTIP_PROPS = {
  fitTooltipContentWidth: true,
  tooltipMessage: `Timezone: ${LOCAL_TIMEZONE}`,
};
