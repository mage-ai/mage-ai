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
