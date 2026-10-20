import { ColorsType } from './colors';
import { PaddingVerticalEnum } from './interactive';
import { BorderRadius } from './borders';

export interface MenuType {
  blur: {
    base: string;
    contained: string;
  };
  border: {
    radius: {
      base: string;
    };
  };
  padding: {
    item: {
      base: string;
    };
  };
}

export default function build(colors: ColorsType): MenuType {
  return {
    blur: {
      // saturate: higher, more color from items behind
      // blur: 1-3px
      base: 'blur(20px)',
      contained: 'saturate(100%) blur(3px)',
    },
    border: {
      radius: {
        base: BorderRadius.SM,
      },
    },
    padding: {
      item: {
        base: `${PaddingVerticalEnum.SM} 16px`,
      },
    },
  };
}
