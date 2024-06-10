import { ScreenClass } from 'react-grid-system';
import { SizeEnum } from './sizes';
import { MarginEnum } from './margin';

export enum GridGutterWidthEnum {
  BASE = MarginEnum.BASE,
  SM = MarginEnum.SM,
  XS = MarginEnum.XS,
}

export interface GridType {
  gutter: {
    width: {
      base: number;
      sm: number;
      xs: number;
    };
  };
}

export function gridSystemConfiguration() {
  return {
    breakpoints: [576, 768, 992, 1200, 1600, 1920],
    containerWidths: [540, 740, 960, 1140, 1540, 1810],
    defaultScreenClass: SizeEnum.XXL as ScreenClass,
    gridColumns: 12,
    gutterWidth: GridGutterWidthEnum.BASE,
    maxScreenClass: SizeEnum.XXL as ScreenClass,
  };
}

export default function build(): GridType {
  return {
    gutter: {
      width: {
        base: GridGutterWidthEnum.BASE,
        sm: GridGutterWidthEnum.SM,
        xs: GridGutterWidthEnum.XS,
      },
    },
  };
}
