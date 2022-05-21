import range from 'lodash/range';
import { UNIT } from '@oracle/styles/units/spacing';

export const SMALLEST_SCREEN_WIDTH = 400;
export const BREAKPOINT_SMALL = 600;
export const BREAKPOINT_MEDIUM = 768;
export const BREAKPOINT_LARGE = 992;
export const BREAKPOINT_X_LARGE = 1200;

export const CONTAINER_MAX_WIDTH_SMALL = BREAKPOINT_SMALL - (UNIT * 2);
export const CONTAINER_MAX_WIDTH_MEDIUM = BREAKPOINT_MEDIUM - (UNIT * 2);
export const CONTAINER_MAX_WIDTH_LARGE = BREAKPOINT_LARGE - (UNIT * 2);
export const CONTAINER_MAX_WIDTH_X_LARGE = BREAKPOINT_X_LARGE - (UNIT * 2);

export function screenSizeName(width) {
  if (width === null) {
    return;
  }

  if (width > BREAKPOINT_X_LARGE) {
    return 'xl';
  } else if (width > BREAKPOINT_LARGE) {
    return 'lg';
  } else if (width > BREAKPOINT_MEDIUM) {
    return 'md';
  } else if (width > BREAKPOINT_SMALL) {
    return 'sm';
  }

  return 'xs';
}

export const gridTheme = {
  container: {
    maxWidth: {
      sm: CONTAINER_MAX_WIDTH_SMALL,
      md: CONTAINER_MAX_WIDTH_MEDIUM,
      lg: CONTAINER_MAX_WIDTH_LARGE,
      xl: CONTAINER_MAX_WIDTH_X_LARGE,
    },
    padding: UNIT * 3,
  },
  row: {
    padding: 0, // default 15
  },
  col: {
    padding: 0, // default 15
  },
};

export const theme = {
  breakpoints: {
    sm: `${BREAKPOINT_SMALL}px`,
    md: `${BREAKPOINT_MEDIUM}px`,
    lg: `${BREAKPOINT_LARGE}px`,
    xl: `${BREAKPOINT_X_LARGE}px`,
  },
  space: range(100).map(i => i * 8),
};
