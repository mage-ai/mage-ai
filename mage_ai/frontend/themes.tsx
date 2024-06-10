// Content from: colors.ts
import { ModeEnum, ModeType } from './modes';
import { blue as blueGradient } from './gradients';

interface InteractiveElementStateColorsType {
  default: string;
  hover: string;
}

export interface BackgroundsType {
  body: string;
  button: {
    base: InteractiveElementStateColorsType;
    primary: InteractiveElementStateColorsType;
    secondary: InteractiveElementStateColorsType;
  };
  input: {
    base: {
      active: ModeType;
      default: ModeType;
      focus: ModeType;
      hover: ModeType;
    };
  };
  menu: {
    base: {
      default: ModeType;
    };
  };
  scrollbar: {
    thumb: {
      default: ModeType;
      hover: ModeType;
    };
    track: {
      default: ModeType;
      hover: ModeType;
    };
  };
}

export interface TypographyColorsType {
  text: {
    base: string;
    blue: string;
    inverted: string;
    muted: string;
  };
}

export interface BordersType {
  base: {
    default: ModeType;
    hover: ModeType;
  };
  button: {
    base: InteractiveElementStateColorsType;
    basic: InteractiveElementStateColorsType;
    primary: InteractiveElementStateColorsType;
    secondary: InteractiveElementStateColorsType;
  };
  input: {
    base: {
      active: ModeType;
      default: ModeType;
      focus: ModeType;
      hover: ModeType;
    };
  };
}

export interface OutlineType {
  button: {
    base: InteractiveElementStateColorsType;
    basic: InteractiveElementStateColorsType;
    primary: InteractiveElementStateColorsType;
    secondary: InteractiveElementStateColorsType;
  };
}

interface ColorsDerivedType {
  backgrounds: BackgroundsType;
  borders: BordersType;
  icons: {
    base: string;
    inverted: string;
  };
  outline: OutlineType;
  placeholder: {
    input: {
      base: string;
    };
  };
  statuses: {
    success: ModeType;
    successHi: ModeType;
  };
  typography: TypographyColorsType;
}

export interface ColorsType extends ColorsDerivedType {
  black: string;
  blackFixed: string;
  blue: string;
  blueLo: string;
  blueMd: string;
  blueMuted: string;
  blueHi: string;
  dbt: string;
  dbtLo: string;
  dbtMd: string;
  dbtHi: string;
  blueText: string;
  glow: string;
  glow2: string;
  gray: string;
  grayLo: string;
  grayMd: string;
  grayHi: string;
  green: string;
  greenLo: string;
  greenMd: string;
  greenHi: string;
  pink: string;
  pinkLo: string;
  pinkMd: string;
  pinkHi: string;
  purple: string;
  purpleLo: string;
  purpleMd: string;
  purpleHi: string;
  red: string;
  redLo: string;
  redMd: string;
  redHi: string;
  sky: string;
  skyLo: string;
  skyMd: string;
  skyHi: string;
  rose: string;
  roseLo: string;
  roseMd: string;
  roseHi: string;
  teal: string;
  tealLo: string;
  tealMd: string;
  tealHi: string;
  yellow: string;
  yellowLo: string;
  yellowMd: string;
  yellowHi: string;
  white: string;
  whiteFixed: string;
  whiteLo: string;
  whiteMd: string;
  whiteHi: string;
}

const Colors = {
  black: {
    [ModeEnum.DARK]: '#000000',
    [ModeEnum.LIGHT]: '#000000',
    [ModeEnum.MODE3]: '#000000',
  },
  blackFixed: {
    [ModeEnum.DARK]: '#000000',
    [ModeEnum.LIGHT]: '#000000',
    [ModeEnum.MODE3]: '#000000',
  },
  blackLo: {
    [ModeEnum.DARK]: '#00000033',
    [ModeEnum.LIGHT]: '#00000033',
    [ModeEnum.MODE3]: '#00000033',
  },
  blackMd: {
    [ModeEnum.DARK]: '#00000099', // 60%
    [ModeEnum.LIGHT]: '#00000099',
    [ModeEnum.MODE3]: '#00000099',
  },
  blackHi: {
    [ModeEnum.DARK]: '#000000D9',
    [ModeEnum.LIGHT]: '#000000D9',
    [ModeEnum.MODE3]: '#000000D9',
  },
  blue: {
    [ModeEnum.DARK]: '#0500FF',
    [ModeEnum.LIGHT]: '#0500FF',
    [ModeEnum.MODE3]: '#4776FF',
  },
  blueHi: {
    [ModeEnum.DARK]: '#0500FFD9',
    [ModeEnum.LIGHT]: '#0500FFD9',
    [ModeEnum.MODE3]: '#4776FFD9',
  },
  blueLo: {
    [ModeEnum.DARK]: '#0500FF33',
    [ModeEnum.LIGHT]: '#0500FF33',
    [ModeEnum.MODE3]: '#4776FF33',
  },
  blueMd: {
    [ModeEnum.DARK]: '#0500FFB3',
    [ModeEnum.LIGHT]: '#0500FFB3',
    [ModeEnum.MODE3]: '#4776FFB3',
  },
  blueMuted: {
    [ModeEnum.DARK]: '#5AA6FF',
    [ModeEnum.LIGHT]: '#5AA6FF',
    [ModeEnum.MODE3]: '#5AA6FF',
  },
  blueText: {
    [ModeEnum.DARK]: '#1F6BFF',
    [ModeEnum.LIGHT]: '#1F6BFF',
    [ModeEnum.MODE3]: '#9EC8FF',
  },
  teal: {
    [ModeEnum.DARK]: '#00B4CC',
    [ModeEnum.LIGHT]: '#00B4CC',
    [ModeEnum.MODE3]: '#00B4CC',
  },
  tealHi: {
    [ModeEnum.DARK]: 'rgba(0, 180, 204, 0.5)',
    [ModeEnum.LIGHT]: 'rgba(0, 180, 204, 0.5)',
    [ModeEnum.MODE3]: 'rgba(0, 180, 204, 0.5)',
  },
  tealLo: {
    [ModeEnum.DARK]: '#00B4CC33',
    [ModeEnum.LIGHT]: '#00B4CC33',
    [ModeEnum.MODE3]: '#00B4CC33',
  },
  tealMd: {
    [ModeEnum.DARK]: '#00B4CCB3',
    [ModeEnum.LIGHT]: '#00B4CCB3',
    [ModeEnum.MODE3]: '#00B4CCB3',
  },
  dbt: {
    [ModeEnum.DARK]: '#FC6949',
    [ModeEnum.LIGHT]: '#FC6949',
    [ModeEnum.MODE3]: '#FC6949',
  },
  dbtHi: {
    [ModeEnum.DARK]: '#FC6949D9',
    [ModeEnum.LIGHT]: '#FC6949D9',
    [ModeEnum.MODE3]: '#FC6949D9',
  },
  dbtLo: {
    [ModeEnum.DARK]: 'rgba(252, 105, 73, 0.3)',
    [ModeEnum.LIGHT]: 'rgba(252, 105, 73, 0.3)',
    [ModeEnum.MODE3]: 'rgba(252, 105, 73, 0.3)',
  },
  dbtMd: {
    [ModeEnum.DARK]: 'rgba(252, 105, 73, 0.5)',
    [ModeEnum.LIGHT]: 'rgba(252, 105, 73, 0.5)',
    [ModeEnum.MODE3]: 'rgba(252, 105, 73, 0.5)',
  },
  glow: {
    [ModeEnum.DARK]: '#0500FF66',
    [ModeEnum.LIGHT]: '#0500FF4D',
    [ModeEnum.MODE3]: '#000000',
  },
  glow2: {
    [ModeEnum.DARK]: '#0500FF',
    [ModeEnum.LIGHT]: '#FFFFFF',
    [ModeEnum.MODE3]: '#18181C',
  },
  gray: {
    [ModeEnum.DARK]: '#34404C',
    [ModeEnum.LIGHT]: '#BBAFDA',
    [ModeEnum.MODE3]: '#2E3036',
  },
  grayLo: {
    [ModeEnum.DARK]: '#34404C33',
    [ModeEnum.LIGHT]: '#BBAFDA1A',
    [ModeEnum.MODE3]: '#2E303633',
  },
  grayMd: {
    [ModeEnum.DARK]: '#34404CB3',
    [ModeEnum.LIGHT]: '#BBAFDAB3',
    [ModeEnum.MODE3]: '#2E3036B3',
  },
  grayHi: {
    [ModeEnum.DARK]: '#34404CD9',
    [ModeEnum.LIGHT]: '#BBAFDAD9',
    [ModeEnum.MODE3]: '#2E3036D9',
  },
  green: {
    [ModeEnum.DARK]: '#00C868',
    [ModeEnum.LIGHT]: '#00C868',
    [ModeEnum.MODE3]: '#00C868',
  },
  greenLo: {
    [ModeEnum.DARK]: '#00C86833',
    [ModeEnum.LIGHT]: '#00C86833',
    [ModeEnum.MODE3]: '#00C86833',
  },
  greenMd: {
    [ModeEnum.DARK]: '#00C868B3',
    [ModeEnum.LIGHT]: '#00C868B3',
    [ModeEnum.MODE3]: '#00C868B3',
  },
  greenHi: {
    [ModeEnum.DARK]: '#00C868D9',
    [ModeEnum.LIGHT]: '#00C868D9',
    [ModeEnum.MODE3]: '#00C868D9',
  },
  pink: {
    [ModeEnum.DARK]: '#DD55FF',
    [ModeEnum.LIGHT]: '#DD55FF',
    [ModeEnum.MODE3]: '#DD55FF',
  },
  pinkLo: {
    [ModeEnum.DARK]: '#DD55FF33',
    [ModeEnum.LIGHT]: '#DD55FF33',
    [ModeEnum.MODE3]: '#DD55FF33',
  },
  pinkMd: {
    [ModeEnum.DARK]: '#DD55FFB3',
    [ModeEnum.LIGHT]: '#DD55FFB3',
    [ModeEnum.MODE3]: '#DD55FFB3',
  },
  pinkHi: {
    [ModeEnum.DARK]: '#DD55FFD9',
    [ModeEnum.LIGHT]: '#DD55FFD9',
    [ModeEnum.MODE3]: '#DD55FFD9',
  },
  purple: {
    [ModeEnum.DARK]: '#956FFF',
    [ModeEnum.LIGHT]: '#956FFF',
    [ModeEnum.MODE3]: '#885EFF',
  },
  purpleLo: {
    [ModeEnum.DARK]: '#956FFF33',
    [ModeEnum.LIGHT]: '#956FFF33',
    [ModeEnum.MODE3]: '#885EFF33',
  },
  purpleMd: {
    [ModeEnum.DARK]: '#956FFFB3',
    [ModeEnum.LIGHT]: '#956FFFB3',
    [ModeEnum.MODE3]: '#885EFFB3',
  },
  purpleHi: {
    [ModeEnum.DARK]: '#956FFFD9',
    [ModeEnum.LIGHT]: '#956FFFD9',
    [ModeEnum.MODE3]: '#885EFFD9',
  },
  red: {
    [ModeEnum.DARK]: '#FF3B3B',
    [ModeEnum.LIGHT]: '#FF3B3B',
    [ModeEnum.MODE3]: '#FF3B3B',
  },
  redHi: {
    [ModeEnum.DARK]: '#FF3B3BD9',
    [ModeEnum.LIGHT]: '#FF3B3BD9',
    [ModeEnum.MODE3]: '#FF3B3BD9',
  },
  redLo: {
    [ModeEnum.DARK]: '#FF3B3B33',
    [ModeEnum.LIGHT]: '#FF3B3B33',
    [ModeEnum.MODE3]: '#FF3B3B33',
  },
  redMd: {
    [ModeEnum.DARK]: '#FF3B3BB3',
    [ModeEnum.LIGHT]: '#FF3B3BB3',
    [ModeEnum.MODE3]: '#FF3B3BB3',
  },
  rose: {
    [ModeEnum.DARK]: '#D1A2AB',
    [ModeEnum.LIGHT]: '#D1A2AB',
    [ModeEnum.MODE3]: '#D1A2AB',
  },
  roseHi: {
    [ModeEnum.DARK]: '#D1A2ABD9',
    [ModeEnum.LIGHT]: '#D1A2ABD9',
    [ModeEnum.MODE3]: '#D1A2ABD9',
  },
  roseLo: {
    [ModeEnum.DARK]: '#D1A2AB33',
    [ModeEnum.LIGHT]: '#D1A2AB33',
    [ModeEnum.MODE3]: '#D1A2AB33',
  },
  roseMd: {
    [ModeEnum.DARK]: '#D1A2ABB3',
    [ModeEnum.LIGHT]: '#D1A2ABB3',
    [ModeEnum.MODE3]: '#D1A2ABB3',
  },
  sky: {
    [ModeEnum.DARK]: '#9ECBFF',
    [ModeEnum.LIGHT]: '#9ECBFF',
    [ModeEnum.MODE3]: '#9ECBFF',
  },
  skyHi: {
    [ModeEnum.DARK]: 'rgba(106, 161, 224, 0.5)',
    [ModeEnum.LIGHT]: 'rgba(106, 161, 224, 0.5)',
    [ModeEnum.MODE3]: 'rgba(106, 161, 224, 0.5)',
  },
  skyLo: {
    [ModeEnum.DARK]: '#6AA1E0',
    [ModeEnum.LIGHT]: '#6AA1E0',
    [ModeEnum.MODE3]: '#6AA1E0',
  },
  skyMd: {
    [ModeEnum.DARK]: '#9ECBFFB3',
    [ModeEnum.LIGHT]: '#9ECBFFB3',
    [ModeEnum.MODE3]: '#9ECBFFB3',
  },
  yellow: {
    [ModeEnum.DARK]: '#FFCC19',
    [ModeEnum.LIGHT]: '#FFCC19',
    [ModeEnum.MODE3]: '#FFCC19',
  },
  yellowHi: {
    [ModeEnum.DARK]: '#FFCC19D9',
    [ModeEnum.LIGHT]: '#E6B000D9',
    [ModeEnum.MODE3]: '#E6B000D9',
  },
  yellowLo: {
    [ModeEnum.DARK]: '#FFCC1933',
    [ModeEnum.LIGHT]: '#E6B00033',
    [ModeEnum.MODE3]: '#E6B00033',
  },
  yellowMd: {
    [ModeEnum.DARK]: '#FFCC19',
    [ModeEnum.LIGHT]: '#E6B000',
    [ModeEnum.MODE3]: '#E6B000',
  },
  white: {
    [ModeEnum.DARK]: '#FFFFFF',
    [ModeEnum.LIGHT]: '#FFFFFF',
    [ModeEnum.MODE3]: '#18181C',
  },
  whiteFixed: {
    [ModeEnum.DARK]: '#FFFFFF',
    [ModeEnum.LIGHT]: '#FFFFFF',
    [ModeEnum.MODE3]: '#FFFFFF',
  },
  whiteLo: {
    [ModeEnum.DARK]: '#FFFFFF80',
    [ModeEnum.LIGHT]: '#1B006699',
    [ModeEnum.MODE3]: '#FFFFFF80',
  },
  whiteMd: {
    [ModeEnum.DARK]: '#FFFFFF99', // 60%
    [ModeEnum.LIGHT]: '#1B006699',
    [ModeEnum.MODE3]: '#FFFFFF99', // 60%
  },
  whiteHi: {
    [ModeEnum.DARK]: '#FFFFFF1A',
    [ModeEnum.LIGHT]: '#1B00661A',
    [ModeEnum.MODE3]: '#FFFFFF1A',
  },
};

function convert(mapping: ModeType): ModeType {
  return Object.entries(mapping).reduce(
    (acc, [mode, color]) => ({
      ...acc,
      [mode]: Colors?.[color]?.[mode] || color,
    }),
    {} as ModeType,
  );
}

const ColorsDerived = {
  backgrounds: {
    body: convert({
      [ModeEnum.DARK]: 'black',
      [ModeEnum.LIGHT]: 'white',
      [ModeEnum.MODE3]: 'gray',
    }),
    button: {
      base: {
        default: {
          [ModeEnum.DARK]: '#28333D',
          [ModeEnum.LIGHT]: '#EBECF4',
          [ModeEnum.MODE3]: '#EBECF4',
        },
        hover: convert({
          [ModeEnum.DARK]: 'grayMd',
          [ModeEnum.LIGHT]: 'whiteHi',
          [ModeEnum.MODE3]: 'whiteHi',
        }),
      },
      basic: {
        default: {
          [ModeEnum.DARK]: 'transparent',
          [ModeEnum.LIGHT]: 'transparent',
          [ModeEnum.MODE3]: 'transparent',
        },
        hover: convert({
          [ModeEnum.DARK]: 'whiteHi',
          [ModeEnum.LIGHT]: 'whiteHi',
          [ModeEnum.MODE3]: 'whiteHi',
        }),
      },
      primary: {
        default: convert({
          [ModeEnum.DARK]: 'purple',
          [ModeEnum.LIGHT]: 'purple',
          [ModeEnum.MODE3]: 'purple',
        }),
        hover: convert({
          [ModeEnum.DARK]: 'purpleHi',
          [ModeEnum.LIGHT]: 'purpleHi',
          [ModeEnum.MODE3]: 'purpleHi',
        }),
      },
      secondary: {
        default: convert({
          [ModeEnum.DARK]: 'green',
          [ModeEnum.LIGHT]: 'green',
          [ModeEnum.MODE3]: 'green',
        }),
        hover: convert({
          [ModeEnum.DARK]: 'greenHi',
          [ModeEnum.LIGHT]: 'greenHi',
          [ModeEnum.MODE3]: 'greenHi',
        }),
      },
    },
    input: {
      base: {
        active: {
          [ModeEnum.DARK]: blueGradient,
          [ModeEnum.LIGHT]: blueGradient,
          [ModeEnum.MODE3]: blueGradient,
        },
        default: {
          [ModeEnum.DARK]: blueGradient,
          [ModeEnum.LIGHT]: blueGradient,
          [ModeEnum.MODE3]: blueGradient,
        },
        focus: {
          [ModeEnum.DARK]: blueGradient,
          [ModeEnum.LIGHT]: blueGradient,
          [ModeEnum.MODE3]: blueGradient,
        },
        hover: {
          [ModeEnum.DARK]: blueGradient,
          [ModeEnum.LIGHT]: blueGradient,
          [ModeEnum.MODE3]: blueGradient,
        },
      },
    },
    menu: {
      base: {
        default: convert({
          [ModeEnum.DARK]: 'grayMd',
          [ModeEnum.LIGHT]: 'grayMd',
          [ModeEnum.MODE3]: 'grayMd',
        }),
      },
      contained: {
        default: convert({
          [ModeEnum.DARK]: 'gray',
          [ModeEnum.LIGHT]: 'gray',
          [ModeEnum.MODE3]: 'gray',
        }),
      },
    },
    scrollbar: {
      thumb: {
        default: convert({
          [ModeEnum.DARK]: 'gray',
          [ModeEnum.LIGHT]: 'gray',
          [ModeEnum.MODE3]: 'gray',
        }),
        hover: convert({
          [ModeEnum.DARK]: 'whiteLo',
          [ModeEnum.LIGHT]: 'whiteLo',
          [ModeEnum.MODE3]: 'whiteLo',
        }),
      },
      track: {
        default: convert({
          [ModeEnum.DARK]: 'grayLo',
          [ModeEnum.LIGHT]: 'grayLo',
          [ModeEnum.MODE3]: 'grayLo',
        }),
        hover: convert({
          [ModeEnum.DARK]: 'grayMd',
          [ModeEnum.LIGHT]: 'grayMd',
          [ModeEnum.MODE3]: 'grayMd',
        }),
      },
    },
  },
  borders: {
    base: {
      default: convert({
        [ModeEnum.DARK]: 'gray',
        [ModeEnum.LIGHT]: 'gray',
        [ModeEnum.MODE3]: 'gray',
      }),
      hover: convert({
        [ModeEnum.DARK]: 'grayHi',
        [ModeEnum.LIGHT]: 'grayHi',
        [ModeEnum.MODE3]: 'grayHi',
      }),
    },
    button: {
      base: {
        default: {
          [ModeEnum.DARK]: 'gray',
          [ModeEnum.LIGHT]: 'gray',
          [ModeEnum.MODE3]: 'gray',
        },
        hover: convert({
          [ModeEnum.DARK]: 'gray',
          [ModeEnum.LIGHT]: 'gray',
          [ModeEnum.MODE3]: 'gray',
        }),
      },
      basic: {
        default: {
          [ModeEnum.DARK]: 'gray',
          [ModeEnum.LIGHT]: 'gray',
          [ModeEnum.MODE3]: 'gray',
        },
        hover: convert({
          [ModeEnum.DARK]: 'gray',
          [ModeEnum.LIGHT]: 'gray',
          [ModeEnum.MODE3]: 'gray',
        }),
      },
      primary: {
        default: convert({
          [ModeEnum.DARK]: 'gray',
          [ModeEnum.LIGHT]: 'gray',
          [ModeEnum.MODE3]: 'gray',
        }),
        hover: convert({
          [ModeEnum.DARK]: 'gray',
          [ModeEnum.LIGHT]: 'gray',
          [ModeEnum.MODE3]: 'gray',
        }),
      },
      secondary: {
        default: convert({
          [ModeEnum.DARK]: 'gray',
          [ModeEnum.LIGHT]: 'gray',
          [ModeEnum.MODE3]: 'gray',
        }),
        hover: convert({
          [ModeEnum.DARK]: 'gray',
          [ModeEnum.LIGHT]: 'gray',
          [ModeEnum.MODE3]: 'gray',
        }),
      },
    },
    input: {
      base: {
        active: convert({
          [ModeEnum.DARK]: 'blueText',
          [ModeEnum.LIGHT]: 'blueText',
          [ModeEnum.MODE3]: 'blueText',
        }),
        default: convert({
          [ModeEnum.DARK]: 'blue',
          [ModeEnum.LIGHT]: 'blue',
          [ModeEnum.MODE3]: 'blue',
        }),
        focus: convert({
          [ModeEnum.DARK]: 'blueText',
          [ModeEnum.LIGHT]: 'blueText',
          [ModeEnum.MODE3]: 'blueText',
        }),
        hover: convert({
          [ModeEnum.DARK]: 'blueText',
          [ModeEnum.LIGHT]: 'blueText',
          [ModeEnum.MODE3]: 'blueText',
        }),
      },
    },
    muted: {
      default: {
        [ModeEnum.DARK]: 'grayLo',
        [ModeEnum.LIGHT]: 'grayLo',
        [ModeEnum.MODE3]: 'grayLo',
      },
      hover: convert({
        [ModeEnum.DARK]: 'grayLo',
        [ModeEnum.LIGHT]: 'grayLo',
        [ModeEnum.MODE3]: 'grayLo',
      }),
    },
  },
  icons: {
    base: convert({
      [ModeEnum.DARK]: 'white',
      [ModeEnum.LIGHT]: 'black',
      [ModeEnum.MODE3]: 'gray',
    }),
    inverted: convert({
      [ModeEnum.DARK]: 'black',
      [ModeEnum.LIGHT]: 'white',
      [ModeEnum.MODE3]: 'gray',
    }),
  },
  outline: {
    button: {
      base: {
        default: {
          [ModeEnum.DARK]: 'gray',
          [ModeEnum.LIGHT]: 'gray',
          [ModeEnum.MODE3]: 'gray',
        },
        hover: convert({
          [ModeEnum.DARK]: 'gray',
          [ModeEnum.LIGHT]: 'gray',
          [ModeEnum.MODE3]: 'gray',
        }),
      },
      basic: {
        default: {
          [ModeEnum.DARK]: 'whiteLo',
          [ModeEnum.LIGHT]: 'blackLo',
          [ModeEnum.MODE3]: 'blackLo',
        },
        hover: convert({
          [ModeEnum.DARK]: 'whiteLo',
          [ModeEnum.LIGHT]: 'blackLo',
          [ModeEnum.MODE3]: 'blackLo',
        }),
      },
      primary: {
        default: convert({
          [ModeEnum.DARK]: 'purple',
          [ModeEnum.LIGHT]: 'purple',
          [ModeEnum.MODE3]: 'purple',
        }),
        hover: convert({
          [ModeEnum.DARK]: 'purple',
          [ModeEnum.LIGHT]: 'purple',
          [ModeEnum.MODE3]: 'purple',
        }),
      },
      secondary: {
        default: convert({
          [ModeEnum.DARK]: 'green',
          [ModeEnum.LIGHT]: 'green',
          [ModeEnum.MODE3]: 'green',
        }),
        hover: convert({
          [ModeEnum.DARK]: 'green',
          [ModeEnum.LIGHT]: 'green',
          [ModeEnum.MODE3]: 'green',
        }),
      },
    },
  },
  placeholder: {
    input: {
      base: convert({
        [ModeEnum.DARK]: 'whiteLo',
        [ModeEnum.LIGHT]: 'blackLo',
        [ModeEnum.MODE3]: 'blackLo',
      }),
    },
  },
  statuses: {
    success: {
      [ModeEnum.DARK]: '#8ADE00',
      [ModeEnum.LIGHT]: '#8ADE00',
      [ModeEnum.MODE3]: '#8ADE00',
    },
    successHi: {
      [ModeEnum.DARK]: 'rgba(138, 222, 0, 0.3)',
      [ModeEnum.LIGHT]: 'rgba(138, 222, 0, 0.3)',
      [ModeEnum.MODE3]: 'rgba(138, 222, 0, 0.3)',
    },
  },
  typography: {
    button: {
      base: convert({
        [ModeEnum.DARK]: 'white',
        [ModeEnum.LIGHT]: '#130048',
        [ModeEnum.MODE3]: '#130048',
      }),
    },
    text: {
      base: convert({
        [ModeEnum.DARK]: 'white',
        [ModeEnum.LIGHT]: 'black',
        [ModeEnum.MODE3]: 'black',
      }),
      blue: convert({
        [ModeEnum.DARK]: 'blueText',
        [ModeEnum.LIGHT]: 'blueText',
        [ModeEnum.MODE3]: 'blueText',
      }),
      inverted: convert({
        [ModeEnum.DARK]: 'black',
        [ModeEnum.LIGHT]: 'white',
        [ModeEnum.MODE3]: 'white',
      }),
      muted: convert({
        [ModeEnum.DARK]: 'whiteMd',
        [ModeEnum.LIGHT]: 'blackMd',
        [ModeEnum.MODE3]: 'blackMd',
      }),
    },
  },
};

const ColorsAll = { ...Colors, ...ColorsDerived };

export default ColorsAll;


// Content from: padding.ts
export interface PaddingType {
  base: number;
  sm: number;
  xs: number;
}

export default function build(): PaddingType {
  return {
    base: 12,
    sm: 8,
    xs: 4,
  };
}


// Content from: helpers.ts
import Colors from './colors';
import { ModeEnum, ModeType } from './modes';
import { mergeDeep, setNested } from '@utils/hash';

export function unflatten(mapping: { [key: string]: ModeType }): any {
  return Object.entries(mapping).reduce((acc, [key, modeValues]) => {
    const values = Object.entries(modeValues).reduce(
      (acc2, [mode, color]) => ({
        ...acc2,
        [mode]: Colors[color][mode],
      }),
      {},
    );
    const obj = setNested(acc, key, values);

    return mergeDeep(acc, obj);
  }, {} as any);
}

export function extractValueInMode(mode: ModeEnum, mapping: any) {
  return Object.entries(mapping).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]:
        typeof value === 'object'
          ? Object.keys(value as object).some(key => key === mode)
            ? value[mode]
            : extractValueInMode(mode, value)
          : value,
    }),
    {},
  );
}


// Content from: fonts.ts
import { ColorsType, TypographyColorsType } from './colors';
import { UNIT } from './spaces';

type FontFamilyType = {
  black: string;
  bold: string;
  boldItalic?: string;
  lightFont: string;
  medium: string;
  regular: string;
  regularItalic?: string;
  semiBold: string;
};

export interface FontsType {
  color: TypographyColorsType;
  family: {
    base: FontFamilyType;
    monospace: FontFamilyType;
  };
  lineHeight: {
    base: string;
    md: string;
    monospace: string;
    sm: string;
    xs: string;
  };
  size: {
    base: string;
    sm: string;
    xs: string;
  };
  style: {
    base: string;
    italic: string;
  };
  weight: {
    bold: number;
    light: number;
    medium: number;
    regular: number;
    semiBold: number;
  };
}

export default function build(colors: ColorsType): FontsType {
  return {
    color: colors.typography,
    family: {
      base: {
        black: 'Inter Black, sans-serif',
        bold: 'Inter Bold, sans-serif',
        lightFont: 'Inter Light, sans-serif',
        medium: 'Inter Medium, sans-serif',
        regular: 'Inter Regular, sans-serif',
        semiBold: 'Inter SemiBold, sans-serif',
      },
      monospace: {
        black: 'Fira Code Bold, monospace',
        bold: 'Fira Code Bold, monospace',
        boldItalic: 'Fira Code Bold Italic, monospace',
        lightFont: 'Fira Code Light, monospace',
        medium: 'Fira Code Medium, monospace',
        regular: 'Fira Code Retina, Fira Code Regular, monospace',
        regularItalic: 'Fira Code Regular Italic, monospace',
        semiBold: 'Fira Code SemiBold, monospace',
      },
    },
    lineHeight: {
      base: 'normal', // 100% - 120%
      md: '144%',
      monospace: '160%',
      sm: `${UNIT * 5}px`,
      xs: '125%',
    },
    size: {
      base: '16px',
      sm: '14px',
      xs: '12px',
    },
    style: {
      base: 'normal',
      italic: 'italic',
    },
    weight: {
      bold: 700,
      light: 300,
      medium: 500,
      regular: 400,
      semiBold: 600,
    },
  };
}


// Content from: blocks.ts
import ThemeType from './interfaces';
import { BlockColorEnum, BlockTypeEnum } from '@interfaces/BlockType';
import { ColorsType } from './colors';

export function getBlockColor(
  blockType: BlockTypeEnum,
  props?: {
    blockColor?: BlockColorEnum;
    isSelected?: boolean;
    theme?: ThemeType;
  },
): {
  accent?: string;
  accentDark?: string;
  accentLight?: string;
} {
  const { blockColor, isSelected, theme } = props || {};
  const colors = theme?.colors || ({} as ColorsType);

  let accent = colors?.typography?.text?.base;
  let accentLight = colors?.typography?.text?.muted;
  let accentDark;

  if (isSelected) {
  } else if (BlockTypeEnum.TRANSFORMER === blockType || blockColor === BlockColorEnum.PURPLE) {
    accent = colors?.purple;
    accentLight = colors?.purpleHi;
  } else if (BlockTypeEnum.DATA_EXPORTER === blockType || blockColor === BlockColorEnum.YELLOW) {
    accent = colors?.yellow;
    accentLight = colors?.yellowHi;
  } else if (BlockTypeEnum.DATA_LOADER === blockType || blockColor === BlockColorEnum.BLUE) {
    accent = colors?.blueText;
    accentLight = colors?.blueHi;
  } else if (BlockTypeEnum.MARKDOWN === blockType) {
    accent = colors?.sky;
    accentLight = colors?.skyHi;
  } else if (BlockTypeEnum.SENSOR === blockType || blockColor === BlockColorEnum.PINK) {
    accent = colors?.pink;
    accentLight = colors?.pinkHi;
  } else if (BlockTypeEnum.DBT === blockType) {
    accent = colors?.dbt;
    accentLight = colors?.dbtHi;
    accentDark = colors?.dbtLo;
  } else if (BlockTypeEnum.EXTENSION === blockType || blockColor === BlockColorEnum.TEAL) {
    accent = colors?.teal;
    accentLight = colors?.tealHi;
  } else if (BlockTypeEnum.CALLBACK === blockType) {
    accent = colors?.rose;
    accentLight = colors?.roseHi;
  } else if (BlockTypeEnum.CONDITIONAL === blockType) {
    accent = colors?.typography?.text?.base;
    accentLight = colors?.typography?.text?.muted;
  } else if (
    BlockTypeEnum.SCRATCHPAD === blockType ||
    blockColor === BlockColorEnum.GREY ||
    (BlockTypeEnum.CUSTOM === blockType && !blockColor)
  ) {
    accent = colors?.typography?.text?.muted;
    accentLight = colors?.typography?.text?.muted;
  } else if (
    [BlockTypeEnum.CHART, BlockTypeEnum.GLOBAL_DATA_PRODUCT].includes(blockType) &&
    !blockColor
  ) {
    accent = colors?.typography?.text?.base;
    accentLight = colors?.typography?.text?.muted;
  }

  return {
    accent,
    accentLight,
    accentDark,
  };
}


// Content from: menus.ts
import { BackgroundsType, ColorsType } from './colors';
import { PaddingVerticalEnum } from './interactive';
import { BorderRadius } from './borders';

export interface MenuType {
  background: BackgroundsType['menu'];
  blur: {
    base: string;
  };
  border: {
    radius: {
      base: string;
    };
  };
  padding: {
    base: string;
  };
}

export default function build(colors: ColorsType): MenuType {
  return {
    background: colors.backgrounds.menu,
    blur: {
      // saturate: higher, more color from items behind
      // blur: 1-3px
      base: 'saturate(100%) blur(3px)',
    },
    border: {
      radius: {
        base: BorderRadius.SM,
      },
    },
    padding: {
      base: `${PaddingVerticalEnum.SM} ${PaddingVerticalEnum.SM}`,
    },
  };
}


// Content from: scrollbars.ts
import { BackgroundsType, ColorsType } from './colors';
import { BorderRadius } from './borders';

export interface ScrollbarsType {
  background: BackgroundsType['scrollbar'];
  border: {
    radius: {
      thumb: string;
      track: string;
    };
  };
  width: {
    thumb: number;
    track: number;
  };
}

export default function build(colors: ColorsType): ScrollbarsType {
  return {
    background: colors.backgrounds.scrollbar,
    border: {
      radius: {
        thumb: BorderRadius.ROUND,
        track: BorderRadius.BASE,
      },
    },
    width: {
      thumb: 4,
      track: 6,
    },
  };
}


// Content from: interactive.ts
export enum PaddingVerticalEnum {
  BASE = '13px',
  MD = '12px',
  SM = '8px',
  XS = '6px',
}


// Content from: buttons.ts
import { BordersType, ColorsType, OutlineType } from './colors';
import { PaddingVerticalEnum } from './interactive';

export interface ButtonsType {
  border: {
    color: BordersType['button'];
  };
  grid: {
    column: {
      gap: {
        base: number;
        sm: number;
      };
    };
  };
  outline: {
    color: OutlineType['button'];
  };
  padding: {
    base: string;
    sm: string;
    xs: string;
  };
}

export default function build(colors: ColorsType): ButtonsType {
  return {
    border: {
      color: colors.borders.button,
    },
    grid: {
      column: {
        gap: {
          base: 8,
          sm: 6,
        },
      },
    },
    outline: {
      color: colors.outline.button,
    },
    padding: {
      base: `${PaddingVerticalEnum.BASE} 14px`,
      sm: `${PaddingVerticalEnum.MD} 13px`,
      xs: `${PaddingVerticalEnum.XS} ${PaddingVerticalEnum.SM}`,
    },
  };
}


// Content from: inputs.ts
import { BackgroundsType, BordersType as BorderColorsType, ColorsType } from './colors';
import { BorderRadius } from './borders';
import { PaddingVerticalEnum } from './interactive';

export interface InputsType {
  background: BackgroundsType['input'];
  border: {
    color: BorderColorsType['input'];
    radius: {
      base: string;
    };
    style: {
      base: string;
    };
    width: {
      base: string;
    };
  };
  padding: {
    base: string;
    sm: string;
  };
  placeholder: {
    color: string;
  };
}

export default function build(colors: ColorsType): InputsType {
  return {
    background: colors.backgrounds.input,
    border: {
      color: colors.borders.input,
      radius: {
        base: BorderRadius.BASE,
      },
      style: {
        base: 'solid',
      },
      width: {
        base: '1px',
      },
    },
    padding: {
      base: `${PaddingVerticalEnum.BASE} 16px`,
      sm: `${PaddingVerticalEnum.SM} 16px`,
    },
    placeholder: {
      color: colors.placeholder.input.base,
    },
  };
}


// Content from: utils.ts
// @ts-ignore
import Cookies from 'js-cookie';
import ServerCookie from 'next-cookies';

import ThemeType, { ThemeSettingsType } from './interfaces';
import buildTheme from './build';
import { SHARED_OPTS } from '@api/utils/token';

const KEY: 'theme_settings' = 'theme_settings';

export function getThemeSettings(ctx?: any): ThemeSettingsType {
  let themeSettings: ThemeSettingsType | string | undefined | null = null;

  if (ctx) {
    const cookie = ServerCookie(ctx);
    if (typeof cookie !== 'undefined') {
      themeSettings = cookie[KEY];
    }
  } else {
    themeSettings = Cookies.get(KEY, SHARED_OPTS);
  }

  if (typeof themeSettings === 'string') {
    themeSettings = JSON.parse(decodeURIComponent(themeSettings));
  }

  if (
    typeof themeSettings !== 'undefined' &&
    themeSettings !== null &&
    typeof themeSettings !== 'string'
  ) {
    return themeSettings;
  }

  return (themeSettings || {}) as ThemeSettingsType;
}

export function getTheme(opts?: { theme?: ThemeSettingsType; ctx?: any }): ThemeType {
  return buildTheme(opts?.theme || getThemeSettings(opts?.ctx));
}

export function setThemeSettings(
  themeSettings: ThemeSettingsType | ((prev: ThemeSettingsType) => ThemeSettingsType),
) {
  const theme = JSON.stringify(
    typeof themeSettings === 'function' ? themeSettings(getThemeSettings()) : themeSettings,
  );

  // @ts-ignore
  Cookies.set(KEY, theme, { ...SHARED_OPTS, expires: 9999 });
}


// Content from: margin.ts
export enum MarginEnum {
  BASE = 12,
  SM = 8,
  XS = 4,
}

export interface MarginType {
  base: number;
  sm: number;
  xs: number;
}

export default function build(): MarginType {
  return {
    base: MarginEnum.BASE,
    sm: MarginEnum.SM,
    xs: MarginEnum.XS,
  };
}


// Content from: sizes.ts
export enum SizeEnum {
  SM = 'sm',
  MD = 'md',
  LG = 'lg',
  XL = 'xl',
  XXL = 'xxl',
  XXXL = 'xxxl',
}


// Content from: modes.ts
export enum ModeEnum {
  DARK = 'dark', // Mode 1
  LIGHT = 'light', // Mode 2
  MODE3 = 'mode3',
}

export interface ModeType {
  [ModeEnum.DARK]: number | string;
  [ModeEnum.LIGHT]: number | string;
  [ModeEnum.MODE3]: number | string;
}

export const DEFAULT_MODE = ModeEnum.DARK;


// Content from: spaces.ts
export const UNIT = 4;


// Content from: gradients.ts
export const blue = `radial-gradient(
  155.7% 118.3% at 22.25% 145.77%,
  rgba(42, 76, 255, 0.08) 0%,
  rgba(42, 76, 255, 0.00) 100%
), rgba(42, 76, 255, 0.10)`;


// Content from: borders.ts
import { ColorsType } from './colors';
import { ModeType } from './modes';

export enum BorderRadius {
  BASE = '10px',
  ROUND = '40px',
  SM = '6px',
}

export interface BordersType {
  color: {
    base: {
      default: ModeType;
      hover: ModeType;
    };
  };
  outline: {
    offset: number;
    width: number;
  };
  radius: {
    base: string;
    round: string;
    sm: string;
  };
  style: string;
  width: string;
}

export default function build(colors: ColorsType): BordersType {
  return {
    color: colors.borders,
    outline: {
      offset: 1,
      width: 2,
    },
    radius: {
      base: BorderRadius.BASE,
      round: BorderRadius.ROUND,
      sm: BorderRadius.SM,
    },
    style: 'solid',
    width: '1px',
  };
}


// Content from: icons.ts
import { ColorsType } from './colors';

export enum IconSizeEnum {
  BASE = 20,
  SM = 17,
  XS = 12,
}

export interface IconsType {
  color: {
    base: string;
    inverted: string;
  };
  size: {
    base: number;
    sm: number;
    xs: number;
  };
}

export default function build(colors: ColorsType): IconsType {
  return {
    color: colors.icons,
    size: {
      base: IconSizeEnum.BASE,
      sm: IconSizeEnum.SM,
      xs: IconSizeEnum.XS,
    },
  };
}


// Content from: backgrounds.ts
import { BackgroundsType as ColorsBackgroundType, ColorsType } from './colors';

export type BackgroundsType = ColorsBackgroundType;

export default function build(colors: ColorsType): BackgroundsType {
  return colors.backgrounds;
}


// Content from: grid.ts
import { ScreenClass } from 'react-grid-system';
import { SizeEnum } from './sizes';
import { MarginEnum } from './margin';

export enum GridGutterWidthEnum {
  BASE = MarginEnum.BASE,
  SM = MarginEnum.SM,
  XS = MarginEnum.XS,
}

export interface GridType {
  gutter: {
    width: {
      base: number;
      sm: number;
      xs: number;
    };
  };
}

export function gridSystemConfiguration() {
  return {
    breakpoints: [576, 768, 992, 1200, 1600, 1920],
    containerWidths: [540, 740, 960, 1140, 1540, 1810],
    defaultScreenClass: SizeEnum.XXL as ScreenClass,
    gridColumns: 12,
    gutterWidth: GridGutterWidthEnum.BASE,
    maxScreenClass: SizeEnum.XXL as ScreenClass,
  };
}

export default function build(): GridType {
  return {
    gutter: {
      width: {
        base: GridGutterWidthEnum.BASE,
        sm: GridGutterWidthEnum.SM,
        xs: GridGutterWidthEnum.XS,
      },
    },
  };
}


// Content from: interfaces.ts
import { BackgroundsType } from './backgrounds';
import { BordersType } from './borders';
import { ButtonsType } from './buttons';
import { ColorsType } from './colors';
import { FontsType } from './fonts';
import { MarginType } from './margin';
import { ModeEnum } from './modes';
import { PaddingType } from './padding';

export enum ThemeTypeEnum {
  CUSTOM = 'custom',
  SYSTEM = 'system',
}

export interface ValueMappingType {
  [key: string]: number | string;
}

export interface ThemeSettingsType {
  mode?: ModeEnum;
  theme?: ThemeType;
  type?: ThemeTypeEnum;
}

export default interface ThemeType {
  backgrounds: BackgroundsType;
  borders: BordersType;
  buttons: ButtonsType;
  colors: ColorsType;
  fonts: FontsType;
  margin: MarginType;
  padding: PaddingType;
}


// Content from: build.ts
import Colors, { ColorsType } from './colors';
import ThemeType, { ThemeSettingsType, ThemeTypeEnum, ValueMappingType } from './interfaces';
import backgrounds, { BackgroundsType } from './backgrounds';
import borders, { BordersType } from './borders';
import buttons, { ButtonsType } from './buttons';
import fonts, { FontsType } from './fonts';
import grid, { GridType } from './grid';
import icons, { IconsType } from './icons';
import inputs, { InputsType } from './inputs';
import margin, { MarginType } from './margin';
import menus, { MenuType } from './menus';
import padding, { PaddingType } from './padding';
import scrollbars, { ScrollbarsType } from './scrollbars';
import { DEFAULT_MODE, ModeEnum, ModeType } from './modes';
import { extractValueInMode } from './helpers';

interface CombinerType {
  colors: ColorsType;
  combine: (
    modeValues: (colors: ColorsType) => ValueMappingType | { [key: string]: ModeType },
    overrideThemeKey?: string,
  ) => ValueMappingType;
}

class Combiner implements CombinerType {
  public colors: ColorsType;
  private mode: ModeEnum;
  private theme: ThemeType;

  constructor(public themeSettings?: ThemeSettingsType) {
    const { mode, theme, type } = themeSettings || ({} as ThemeSettingsType);

    this.mode = mode || DEFAULT_MODE;

    if (ThemeTypeEnum.SYSTEM === type && typeof window !== 'undefined') {
      this.mode = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? ModeEnum.DARK
        : ModeEnum.LIGHT;
    }

    this.theme = null;
    if (ThemeTypeEnum.CUSTOM === type) {
      this.theme = theme;
    }

    this.colors = {
      ...extractValueInMode(this.mode, Colors),
      ...(this.theme?.colors || {}),
    } as ColorsType;

    this.combine = this.combine.bind(this);
  }

  public combine(
    modeValues: (
      colors: ColorsType,
    ) =>
      | ValueMappingType
      | BackgroundsType
      | BordersType
      | ButtonsType
      | ColorsType
      | FontsType
      | GridType
      | IconsType
      | InputsType
      | MarginType
      | MenuType
      | PaddingType
      | ScrollbarsType
      | { [key: string]: ModeType },
    overrideThemeKey?: string,
  ): ValueMappingType {
    const values = extractValueInMode(this.mode, modeValues(this.colors));

    return {
      ...(values || {}),
      ...(this.theme?.[overrideThemeKey] || {}),
    };
  }
}

export default function buildTheme(themeSettings?: ThemeSettingsType): ThemeType {
  const combiner = new Combiner(themeSettings);

  const elements = Object.entries({
    backgrounds,
    borders,
    buttons,
    fonts,
    grid,
    icons,
    inputs,
    margin,
    menus,
    padding,
    scrollbars,
  }).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: combiner.combine(value, key),
    }),
    {} as ThemeType,
  );

  return {
    ...elements,
    colors: combiner.colors,
  };
}


// Content from: scrollbar.ts
export function getScrollbarWidth() {
  if (typeof window === 'undefined') {
    return 0;
  }

  // Create a temporary div container and append it into the body
  const container = document.createElement('div');
  // Append the element
  document.body.appendChild(container);

  // Force scrollbar on the container element
  container.style.overflow = 'scroll';
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.width = '100px';
  container.style.height = '100px';

  // Add inner div
  const inner = document.createElement('div');
  // Force scrollbar on inner div
  inner.style.width = '100%';
  container.appendChild(inner);

  // Calculate the width based on the difference in offsetWidth
  const scrollbarWidth = container.offsetWidth - inner.offsetWidth;

  // Remove the temporary div containers
  document.body.removeChild(container);

  return scrollbarWidth;
}


// Content from: padding.ts
import { css } from 'styled-components';

const base = css`
  padding: ${({ theme }) => theme.padding.base}px;
`;

export default base;


// Content from: scrollbars.ts
import { css } from 'styled-components';

import { transition } from '../styles/mixins';

export type ScrollbarsStyledProps = {
  hidden?: boolean;
  style?: React.CSSProperties;
};

const base = css<ScrollbarsStyledProps>`
  ${({ hidden }) =>
    hidden &&
    `
    // for Internet Explorer, Edge
    -ms-overflow-style: none;
    // for Firefox
    scrollbar-width: none;
    // for Chrome, Safari, and Opera
    ::-webkit-scrollbar {
      display: none;
    }
  `}

  ${({
    theme: {
      scrollbars: { background, border, width },
    },
  }) => `
    ::-webkit-scrollbar {
      height: ${width.track}px;
      width: ${width.track}px;
    }

    ::-webkit-scrollbar-track {
    }

    ::-webkit-scrollbar-thumb {
      ${transition}

      background: ${background.thumb.default};
      border-radius: ${border.radius.thumb};
    }

    ::-webkit-scrollbar-thumb:hover {
      background: ${background.thumb.hover};
    }

    ::-webkit-scrollbar-corner {
      background: ${background.track.default};
    }

    ::-webkit-scrollbar-track {
      background: ${background.track.default};
      border-radius: ${border.radius.track};
    }

    ::-webkit-scrollbar-track:hover {
      background: ${background.track.hover};
    }
  `}
`;

export default base;


// Content from: buttons.ts
import { css } from 'styled-components';
import { UNIT } from '../themes/spaces';
import borders, { bordersTransparent } from './borders';
import text, { StyleProps as TextStyleProps } from './typography';
import { outlineHover, transition, transitionFast } from './mixins';

export type StyleProps = {
  asLink?: boolean;
  basic?: boolean;
  grouped?: boolean;
  primary?: boolean;
  secondary?: boolean;
} & TextStyleProps;

const shared = css<StyleProps>`
  ${({ asLink }) => (asLink ? transitionFast : transition)}
  ${text}

  ${({ asLink, basic, grouped, primary, secondary, theme }) =>
    outlineHover({
      borderColor: theme.fonts.color.text.inverted,
      outlineColor: primary
        ? theme.buttons.outline.color.primary.hover
        : secondary
          ? theme.buttons.outline.color.secondary.hover
          : asLink || basic
            ? theme.buttons.outline.color.basic.hover
            : theme.buttons.outline.color.base.hover,
      outlineOffset: grouped ? UNIT : null,
    })}

  ${({ grouped }) =>
    grouped &&
    `
    border: none;
  `}

  ${({ basic, grouped }) => !grouped && basic && borders}
  ${({ basic, grouped, primary, secondary, theme }) =>
    !grouped &&
    basic &&
    `
    border-color: ${
      primary
        ? theme.buttons.border.color.primary.default
        : secondary
          ? theme.buttons.border.color.secondary.default
          : basic
            ? theme.buttons.border.color.basic.default
            : theme.buttons.border.color.base.default
    };
  `}

  ${({ asLink, basic, grouped, primary, secondary, theme }) =>
    !grouped &&
    (asLink || basic) &&
    `
    &:hover {
      border-color: ${
        primary
          ? theme.buttons.border.color.primary.hover
          : secondary
            ? theme.buttons.border.color.secondary.hover
            : asLink || basic
              ? theme.buttons.border.color.basic.hover
              : theme.buttons.border.color.base.hover
      };
    }
  `}

  ${({ basic, grouped }) => !grouped && !basic && bordersTransparent}

  background-color: ${({ asLink, basic, primary, secondary, theme }) =>
    asLink
      ? 'transparent'
      : primary
        ? theme.colors.backgrounds.button.primary.default
        : secondary
          ? theme.colors.backgrounds.button.secondary.default
          : basic
            ? theme.colors.backgrounds.button.basic.default
            : theme.colors.backgrounds.button.base.default};
  border-radius: ${({ asLink, theme }) => theme.borders.radius[asLink ? 'sm' : 'base']};
  color: ${({ primary, secondary, theme }) =>
    primary || secondary ? theme.fonts.color.text.inverted : theme.fonts.color.text.base};

  font-style: ${({ theme }) => theme.fonts.style.base};

  font-family: ${({ primary, secondary, theme }) =>
    primary || secondary ? theme.fonts.family.base.bold : theme.fonts.family.base.semiBold};
  font-weight: ${({ primary, secondary, theme }) =>
    primary || secondary ? theme.fonts.weight.bold : theme.fonts.weight.semiBold};
  line-height: ${({ theme }) => theme.fonts.lineHeight.base};

  ${({ basic, grouped, primary, secondary, theme }) =>
    !grouped &&
    `
    &:hover {
      background-color: ${
        primary
          ? theme.colors.backgrounds.button.primary.hover
          : secondary
            ? theme.colors.backgrounds.button.secondary.hover
            : basic
              ? theme.colors.backgrounds.button.basic.hover
              : theme.colors.backgrounds.button.base.hover
      };
    }
  `}

  &:hover {
    cursor: pointer;
  }
`;

const base = css<StyleProps>`
  ${shared}
  font-size: ${({ theme }) => theme.fonts.size.base};
  padding: ${({ asLink, grouped, theme }) =>
    grouped ? 0 : asLink ? theme.buttons.padding.xs : theme.buttons.padding.base};
`;

export const sm = css<StyleProps>`
  ${shared}
  font-size: ${({ theme }) => theme.fonts.size.sm};
  padding: ${({ grouped, theme }) => (grouped ? 0 : theme.buttons.padding.sm)};
`;

export default base;


// Content from: inputs.ts
import { css } from 'styled-components';
import text, { StyleProps as TextStyleProps } from './typography';
import borders from './borders';
import { outlineHover, transition } from './mixins';

export type StyleProps = {
  basic?: boolean;
  monospace?: boolean;
  small?: boolean;
  width?: number | string;
} & TextStyleProps;

const shared = css<StyleProps>`
  ${transition}
  ${text}
  ${borders}

  ${({ basic, theme }) =>
    !basic &&
    `
    border-color: ${theme.inputs.border.color.base.default};
  `}

  background: ${({ theme }) => theme.inputs.background.base.default};
  border-radius: ${({ theme }) => theme.inputs.border.radius.base};
  border-style: ${({ theme }) => theme.inputs.border.style.base};
  border-width: ${({ theme }) => theme.inputs.border.width.base};
  font-weight: ${({ theme }) => theme.fonts.weight.medium};
  line-height: ${({ theme }) => theme.fonts.lineHeight.base};
  padding: ${({ small, theme }) => theme.inputs.padding[small ? 'sm' : 'base']};
  width: ${({ width }) =>
    typeof width === 'undefined' ? '100%' : typeof width === 'number' ? `${width}px` : width};

  ::-webkit-input-placeholder {
    color: ${({ theme }) => theme.inputs.placeholder.color};
  }
  ::-moz-placeholder {
    color: ${({ theme }) => theme.inputs.placeholder.color};
  }
  :-ms-input-placeholder {
    color: ${({ theme }) => theme.inputs.placeholder.color};
  }
  :-moz-placeholder {
    color: ${({ theme }) => theme.inputs.placeholder.color};
  }
  ::placeholder {
    color: ${({ theme }) => theme.inputs.placeholder.color};
  }

  &:focus {
    background: ${({ theme }) => theme.inputs.background.base.focus};
    border-color: ${({ basic, theme }) =>
      basic ? theme.borders.color : theme.inputs.border.color.base.focus};
  }

  &:hover {
    background: ${({ theme }) => theme.inputs.background.base.hover};
    border-color: ${({ basic, theme }) =>
      basic ? theme.borders.color : theme.inputs.border.color.base.hover};
  }

  &:active {
    background: ${({ theme }) => theme.inputs.background.base.active};
    border-color: ${({ basic, theme }) =>
      basic ? theme.borders.color : theme.inputs.border.color.base.active};
  }

  ${({ basic, theme }) =>
    outlineHover({
      active: true,
      borderColor: theme.fonts.color.text.inverted,
      outlineColor: basic ? theme.borders.color : theme.inputs.border.color.base.hover,
    })}
`;

const base = css<StyleProps>`
  ${shared}
`;

export default base;


// Content from: borders.ts
import { css } from 'styled-components';

type BorderStyledProps = {
  muted?: boolean;
};

const shared = css`
  border-radius: ${({ theme }) => theme.borders.radius.base};
  border-style: ${({ theme }) => theme.borders.style};
  border-width: ${({ theme }) => theme.borders.width};
`;

const base = css<BorderStyledProps>`
  ${shared}
  border-color: ${({ muted, theme }) => theme.borders.color[muted ? 'muted' : 'base'].default};
`;

export const bordersTransparent = css`
  ${shared}
  border-color: transparent;
`;

export default base;


// Content from: icons.ts
import { css } from 'styled-components';

export type StyleProps = {
  className?: string;
  color?: string;
  colorName?: string;
  fill?: string;
  height?: number;
  inverted?: boolean;
  opacity?: number;
  size?: number;
  small?: boolean;
  stroke?: string;
  style?: any;
  useStroke?: boolean;
  viewBox?: string;
  width?: number;
  xsmall?: boolean;
};

const icons = css<StyleProps>`
  ${({ color, colorName, fill, inverted, theme, useStroke }) =>
    !useStroke &&
    `
    fill: ${
      typeof color !== 'undefined'
        ? color
        : typeof colorName !== 'undefined'
          ? theme.colors[colorName]
          : typeof fill !== 'undefined' && fill !== null
            ? fill
            : inverted
              ? theme.icons.color.inverted
              : theme.icons.color.base
    };
  `}

  ${({ color, colorName, inverted, stroke, theme, useStroke }) =>
    useStroke &&
    `
    stroke: ${
      typeof color !== 'undefined'
        ? color
        : typeof colorName !== 'undefined'
          ? theme.colors[colorName]
          : typeof stroke !== 'undefined' && stroke !== null
            ? stroke
            : inverted
              ? theme.icons.color.inverted
              : theme.icons.color.base
    };
  `}
`;

const svg = css<StyleProps>`
  ${({ height, size, small, theme, width, xsmall }) => `
    height: ${
      typeof height === 'undefined' && typeof size === 'undefined'
        ? theme.icons.size[small ? 'sm' : xsmall ? 'xs' : 'base']
        : typeof height === 'undefined'
          ? size
          : height
    }px;
    width: ${
      typeof width === 'undefined' && typeof size === 'undefined'
        ? theme.icons.size[small ? 'sm' : xsmall ? 'xs' : 'base']
        : typeof width === 'undefined'
          ? size
          : width
    }px;
  `}
`;

export { svg };
export default icons;


// Content from: typography.ts
import { css } from 'styled-components';

export type StyleProps = {
  black?: boolean;
  blue?: boolean;
  bold?: boolean;
  inverted?: boolean;
  italic?: boolean;
  light?: boolean;
  medium?: boolean;
  monospace?: boolean;
  muted?: boolean;
  semiBold?: boolean;
};

export const monospaceFontFamily = css<StyleProps>`
  font-family: ${({ black, bold, italic, light, medium, semiBold, theme }) =>
    light
      ? theme.fonts.family.monospace.lightFont
      : medium
        ? theme.fonts.family.monospace.medium
        : semiBold
          ? theme.fonts.family.monospace.semiBold
          : black || bold
            ? italic
              ? theme.fonts.family.monospace.boldItalic
              : theme.fonts.family.monospace.bold
            : italic
              ? theme.fonts.family.monospace.regularItalic
              : theme.fonts.family.monospace.regular};
`;

const baseFontFamily = css<StyleProps>`
  font-family: ${({ black, bold, light, medium, semiBold, theme }) =>
    light
      ? theme.fonts.family.base.lightFont
      : medium
        ? theme.fonts.family.base.medium
        : semiBold
          ? theme.fonts.family.base.semiBold
          : black
            ? theme.fonts.family.base.black
            : bold
              ? theme.fonts.family.base.bold
              : theme.fonts.family.base.regular};
`;

const base = css<StyleProps>`
  ${({ monospace }) => monospace && monospaceFontFamily}

  ${({ monospace }) => !monospace && baseFontFamily}

  color: ${({ blue, inverted, muted, theme }) =>
    inverted
      ? theme.fonts.color.text.inverted
      : blue
        ? theme.fonts.color.text.blue
        : muted
          ? theme.fonts.color.text.muted
          : theme.fonts.color.text.base};

  font-size: ${({ theme }) => theme.fonts.size.base};
  font-style: ${({ italic, theme }) =>
    italic ? theme.fonts.style.italic : theme.fonts.style.base};
  font-weight: ${({ light, medium, semiBold, bold, theme }) =>
    light
      ? theme.fonts.weight.light
      : medium
        ? theme.fonts.weight.medium
        : semiBold
          ? theme.fonts.weight.semiBold
          : bold
            ? theme.fonts.weight.bold
            : theme.fonts.weight.regular};

  line-height: ${({ monospace, theme }) =>
    monospace ? theme.fonts.lineHeight.monospace : theme.fonts.lineHeight.md};
`;

export const baseSm = css<StyleProps>`
  ${base}
  font-size: ${({ theme }) => theme.fonts.size.sm};
  line-height: ${({ theme }) => theme.fonts.lineHeight.base};
`;

export const baseXs = css<StyleProps>`
  ${base}
  font-size: ${({ theme }) => theme.fonts.size.xs};
  line-height: ${({ theme }) => theme.fonts.lineHeight.xs};
`;

export default base;


// Content from: mixins.ts
import { css } from 'styled-components';

export const transition = css`
  transition: 0.2s all ease-in-out;
`;

export const transitionFast = css`
  transition: 0.15s all linear;
`;

export const gradient = (
  angle: string,
  startColor: string,
  endColor: string,
  startPercentage?: number,
  endPercentage?: number,
) => css`
  background-image: -webkit-linear-gradient(
    ${angle},
    ${startColor} ${startPercentage || 0}%,
    ${endColor} ${endPercentage || 100}%
  );
  background-image: -moz-linear-gradient(
    ${angle},
    ${startColor} ${startPercentage || 0}%,
    ${endColor} ${endPercentage || 100}%
  );
  background-image: -o-linear-gradient(
    ${angle},
    ${startColor} ${startPercentage || 0}%,
    ${endColor} ${endPercentage || 100}%
  );
  background-image: linear-gradient(
    ${angle},
    ${startColor} ${startPercentage || 0}%,
    ${endColor} ${endPercentage || 100}%
  );
`;

type OutlineHoverProps = {
  active?: boolean;
  borderColor?: string;
  outlineColor?: string;
  outlineOffset?: number;
  outlineWidth?: number;
};

export const outlineHover = ({
  active,
  borderColor,
  outlineColor,
  outlineOffset,
  outlineWidth,
}: OutlineHoverProps) => css`
  ${({ theme }) => `
    &:hover {
      box-shadow:
        0 0 0
          ${theme.borders.outline.offset + (outlineOffset || 0)}px
          ${borderColor || theme.colors.backgrounds.button.base},
        0 0 0
          ${theme.borders.outline.offset + (outlineOffset || 0) + theme.borders.outline.width + (outlineWidth || 0)}px
          ${outlineColor || theme.colors.purple};
    }

    &:focus {
      box-shadow:
        0 0 0
          ${theme.borders.outline.offset + (outlineOffset || 0)}px
          ${borderColor || theme.colors.backgrounds.button.base},
        0 0 0
          ${theme.borders.outline.offset + (outlineOffset || 0) + theme.borders.outline.width + (outlineWidth || 0)}px
          ${outlineColor || theme.colors.purple};
    }
  `}

  ${!active &&
  `
    &:active {
      box-shadow: none;
    }
  `}

  ${({ theme }) =>
    active &&
    `
    &:active {
      box-shadow:
        0 0 0
          ${theme.borders.outline.offset + (outlineOffset || 0)}px
          ${borderColor || theme.colors.backgrounds.button.base},
        0 0 0
          ${theme.borders.outline.offset + (outlineOffset || 0) + theme.borders.outline.width + (outlineWidth || 0)}px
          ${outlineColor || theme.colors.purple};
    }
  `}
`;


