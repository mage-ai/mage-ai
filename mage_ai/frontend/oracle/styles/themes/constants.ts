export type ThemeType = {
  background: {
    page: string;
    header: string;
    navigation: string;
    row: string;
  },
  chart: {
    gradientFrom: string;
    gradientFromWater: string;
    gradientTo: string;
    gradientToFire: string;
    lines: string;
  },
  content: {
    active: string;
    default: string;
    disabled: string;
    muted: string;
  },
  elevation: {
    visualizationAccent: string,
    visualizationAccentAlt: string,
  }
  loader: {
    color: string,
  },
  monotone: {
    black: string;
    gray: string;
    white: string;
  },
  shadow: {
    base: string;
    hover: string;
    popup: string;
  },
  interactive: {
    dangerBorder: string;
    defaultBorder: string;
    disabledBorder: string;
    focusBorder: string;
    hoverBorder: string;
    linkPrimary: string;
    linkSecondary: string;
  },
};
