export type ThemeType = {
  background: {
    page: string;
    header: string;
    row: string;
  };
  content: {
    active: string;
    default: string;
    disabled: string;
    muted: string;
  };
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
  };
};
