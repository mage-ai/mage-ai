import { ColorsType } from './colors';
import { UNIT } from './spaces';

export interface FontsType {
  color: string;
  family: {
    base: string;
  };
  lineHeight: {
    base: string;
    md: string;
    sm: string;
  };
  size: {
    base: string;
    sm: string;
  };
  style: {
    base: string;
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
    color: colors.text,
    family: {
      base: 'Inter',
    },
    lineHeight: {
      base: 'normal', // 100% - 120%
      md: '140%',
      sm: `${UNIT * 5}px`,
    },
    size: {
      base: `${UNIT * 4}px`,
      sm: `${UNIT * 3}px`,
    },
    style: {
      base: 'normal',
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
