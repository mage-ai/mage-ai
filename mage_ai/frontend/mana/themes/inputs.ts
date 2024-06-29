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
        base: PaddingVerticalEnum.LG,
        sm: PaddingVerticalEnum.LG,
        xs: PaddingVerticalEnum.XS,
      },
      vertical: {
        base: PaddingVerticalEnum.BASE,
        sm: PaddingVerticalEnum.SM,
        xs: PaddingVerticalEnum.XS,
      },
    },
    placeholder: {
      color: colors.placeholder.input.base,
    },
  };
}
