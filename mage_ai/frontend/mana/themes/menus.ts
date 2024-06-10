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
