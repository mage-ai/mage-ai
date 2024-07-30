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
    horizontal: {
      base: string;
      sm: string;
      xs: string;
    };
    vertical: {
      base: string;
      sm: string;
      xs: string;
    };
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
      horizontal: {
        base: `${PaddingVerticalEnum.LG}px`,
        sm: `${PaddingVerticalEnum.LG}px`,
        xs: `${PaddingVerticalEnum.XS}px`,
      },
      vertical: {
        base: `${PaddingVerticalEnum.BASE}px`,
        sm: `${PaddingVerticalEnum.SM}px`,
        xs: `${PaddingVerticalEnum.XS}px`,
      },
    },
    placeholder: {
      color: colors.placeholder.input.base,
    },
  };
}
