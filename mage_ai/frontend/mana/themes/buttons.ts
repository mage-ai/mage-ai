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
        base: 18,
        sm: 16,
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
      // 1 for the border
      base: `${PaddingVerticalEnum.BASE - 1}px 14px`,
      // 1 for the border
      sm: `${PaddingVerticalEnum.MD - 1}px 13px`,
      // 1 for the border
      xs: `${PaddingVerticalEnum.XS - 1}px ${PaddingVerticalEnum.SM}px`,
      // 1 for the border
      xxs: `${PaddingVerticalEnum.XS - 1}px`,
    },
  };
}
