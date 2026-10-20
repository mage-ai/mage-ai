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
      base: '125%', // 100% - 120%
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
