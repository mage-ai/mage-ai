import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { Search } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';

export const BUTTON_PADDING = `${UNIT * 1.5}px`;
export const POPUP_MENU_WIDTH = UNIT * 40;
export const POPUP_TOP_OFFSET = 58;

export enum ConfirmDialogueOpenEnum {
  FIRST = 1,
  SECOND = 2,
}

export const SHARED_TOOLTIP_PROPS = {
  autoHide: true,
  size: null,
  widthFitContent: true,
};

export const SEARCH_INPUT_PROPS = {
  afterIconSize: UNIT * 1.5,
  beforeIcon: <Search />,
  borderRadius: BORDER_RADIUS,
  defaultColor: true,
  fullWidth: true,
  greyBorder: true,
  maxWidth: UNIT * 40,
};
