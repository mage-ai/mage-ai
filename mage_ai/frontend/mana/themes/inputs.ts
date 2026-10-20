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
