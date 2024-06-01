import { ModeEnum } from '../themes/modes';

export interface BackgroundsType {
  body: string;
  button: {
    base: string;
    hover: string;
  };
}

interface ColorsDerivedType {
  backgrounds: BackgroundsType
  text: string;
}

export interface ColorsType extends ColorsDerivedType {
  black: string;
  blackFixed: string;
  blue: string;
  blueLo: string;
  blueText: string;
  glow: string;
  glow2: string;
  gray: string;
  grayLo: string;
  green: string;
  greenLo: string;
  pink: string;
  pinkLo: string;
  purple: string;
  purpleLo: string;
  red: string;
  redLo: string;
  white: string;
  whiteFixed: string;
  whiteHi: string;
  whiteLo: string;
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
  blue: {
    [ModeEnum.DARK]: '#0500FF',
    [ModeEnum.LIGHT]: '#0500FF',
    [ModeEnum.MODE3]: '#4776FF',
  },
  blueLo: {
    [ModeEnum.DARK]: '#0500FF33',
    [ModeEnum.LIGHT]: '#0500FF33',
    [ModeEnum.MODE3]: '#4776FF33',
  },
  blueText: {
    [ModeEnum.DARK]: '#1F6BFF',
    [ModeEnum.LIGHT]: '#1F6BFF',
    [ModeEnum.MODE3]: '#9EC8FF',
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
  red: {
    [ModeEnum.DARK]: '#FF3B3B',
    [ModeEnum.LIGHT]: '#FF3B3B',
    [ModeEnum.MODE3]: '#FF3B3B',
  },
  redLo: {
    [ModeEnum.DARK]: '#FF3B3B33',
    [ModeEnum.LIGHT]: '#FF3B3B33',
    [ModeEnum.MODE3]: '#FF3B3B33',
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
  whiteHi: {
    [ModeEnum.DARK]: '#FFFFFF1A',
    [ModeEnum.LIGHT]: '#1B00661A',
    [ModeEnum.MODE3]: '#FFFFFF1A',
  },
  whiteLo: {
    [ModeEnum.DARK]: '#FFFFFF80',
    [ModeEnum.LIGHT]: '#1B006699',
    [ModeEnum.MODE3]: '#FFFFFF80',
  },
};

const ColorsDerived = {
  backgrounds: {
    body: {
      [ModeEnum.DARK]: 'black',
      [ModeEnum.LIGHT]: 'white',
      [ModeEnum.MODE3]: 'gray',
    },
    button: {
      base: {
        [ModeEnum.DARK]: '#28333D',
        [ModeEnum.LIGHT]: '#28333D',
        [ModeEnum.MODE3]: '#28333D',
      },
      hover: {
        [ModeEnum.DARK]: 'grayLo',
        [ModeEnum.LIGHT]: 'grayLo',
        [ModeEnum.MODE3]: 'grayLo',
      },
    },
  },
  text: {
    [ModeEnum.DARK]: 'white',
    [ModeEnum.LIGHT]: 'black',
    [ModeEnum.MODE3]: 'black',
  },
};

const ColorsAll = { ...Colors, ...ColorsDerived };

export default ColorsAll;
