import { UNIT } from '@oracle/styles/units/spacing';

export const BUTTON_PADDING = `${UNIT * 1.5}px`;
export const POPUP_MENU_WIDTH = UNIT * 40;
export const POPUP_TOP_OFFSET = 58;
export const SHARED_BUTTON_PROPS = {
  bold: true,
  greyBorder: true,
  paddingBottom: 9,
  paddingTop: 9,
};

export enum ConfirmDialogueOpenEnum {
  SECONDARY = 1,
  DELETE = 2,
}

export const SHARED_TOOLTIP_PROPS = {
  autoHide: true,
  size: null,
  widthFitContent: true,
};
