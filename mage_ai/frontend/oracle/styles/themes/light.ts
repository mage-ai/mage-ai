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
  NAVY,
} from '../colors/main';

// eslint-disable-next-line import/no-anonymous-default-export
export default {
  background: {
    header: SILVER,
    muted: SILVER,
    page: WHITE,
    row: LIGHT,
  },
  content: {
    active: BLACK,
    default: WHITE,
    disabled: GRAY,
    muted: GRAY,
  },
  interactive: {
    dangerBorder: RED,
    defaultBorder: GRAY_LINES,
    disabledBorder: GRAY,
    focusBackground: NAVY,
    focusBorder: NAVY_LINES,
    hoverBorder: DARK_GRAY_LINES,
    linkPrimary: BLUE,
    linkSecondary: PURPLE,
  },
  loader: {
    color: RED,
  },
  monotone: {
    black: BLACK,
    gray: GRAY,
    purple: PURPLE,
    white: WHITE,
  },
  progress: {
    negative: RED,
    positive: PURPLE,
  },
  shadow: {
    base: '12px 40px 120px rgba(106, 117, 139, 0.4)',
    hover: '8px 24px 24px 0 rgba(0, 0, 0, 0.12)',
    popup: '10px 20px 40px rgba(0, 0, 0, 0.2);',
  },
};

