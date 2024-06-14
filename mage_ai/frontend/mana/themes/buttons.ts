import { BordersType, ColorsType, OutlineType } from './colors';
import { PaddingVerticalEnum } from './interactive';

export interface ButtonsType {
  border: {
    color: BordersType['button'];
  };

  font: {
    lineHeight: {
      base: number;
      sm: number;
    };
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
    xxs: string;
  };
}

export default function build(colors: ColorsType): ButtonsType {
  return {
    border: {
      color: colors.borders.button,
    },
    font: {
      lineHeight: {
        base: 19,
        sm: 17,
      },
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
      xxs: PaddingVerticalEnum.XS,
    },
  };
}
