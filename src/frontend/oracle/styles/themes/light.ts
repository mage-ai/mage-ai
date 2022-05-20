import {
  BLACK,
  BLUE,
  DARK_GRAY_LINES,
  GRAY_LINES,
  GRAY,
  LIGHT,
  NAVY_LINES,
  PURPLE,
  RED,
  SILVER,
  WHITE,
} from '../colors/main';

export default {
  background: {
    page: WHITE,
    header: SILVER,
    row: LIGHT,
  },
  content: {
    active: WHITE,
    default: WHITE,
    disabled: GRAY,
    muted: GRAY,
  },
  monotone: {
    black: BLACK,
    gray: GRAY,
    white: WHITE,
  },
  shadow: {
    base: '12px 40px 120px rgba(106, 117, 139, 0.4)',
    hover: '8px 24px 24px 0 rgba(0, 0, 0, 0.12)',
    popup: '10px 20px 40px rgba(0, 0, 0, 0.2);',
  },
  interactive: {
    dangerBorder: RED,
    defaultBorder: GRAY_LINES,
    disabledBorder: GRAY,
    focusBorder: NAVY_LINES,
    hoverBorder: DARK_GRAY_LINES,
    linkPrimary: PURPLE,
    linkSecondary: BLUE,
  },
};
