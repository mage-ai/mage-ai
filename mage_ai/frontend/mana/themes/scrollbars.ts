import { BackgroundsType, ColorsType } from './colors';
import { BorderRadius } from './borders';

export interface ScrollbarsType {
  background: BackgroundsType['scrollbar'];
  border: {
    radius: {
      thumb: string;
      track: string;
    };
  };
  width: {
    thumb: number;
    track: number;
  };
}

export default function build(colors: ColorsType): ScrollbarsType {
  return {
    background: colors.backgrounds.scrollbar,
    border: {
      radius: {
        thumb: BorderRadius.ROUND,
        track: BorderRadius.BASE,
      },
    },
    width: {
      thumb: 4,
      track: 6,
    },
  };
}
