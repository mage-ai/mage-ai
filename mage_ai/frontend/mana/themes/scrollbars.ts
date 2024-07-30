import { BackgroundsType, ColorsType } from './colors';
import { BorderRadius } from './borders';

export const SCROLLBAR_THUMB_WIDTH = 4;
export const SCROLLBAR_TRACK_WIDTH = 6;

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
      thumb: SCROLLBAR_THUMB_WIDTH,
      track: SCROLLBAR_TRACK_WIDTH,
    },
  };
}
