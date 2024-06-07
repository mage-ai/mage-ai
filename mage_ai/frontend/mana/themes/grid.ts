import { ScreenClass } from 'react-grid-system';
import { SizeEnum } from './sizes';
import { MarginEnum } from './margin';

export const gutterWidth = MarginEnum.BASE;

export function gridSystemConfiguration() {
  return {
    breakpoints: [576, 768, 992, 1200, 1600, 1920],
    containerWidths: [540, 740, 960, 1140, 1540, 1810],
    defaultScreenClass: SizeEnum.XXL as ScreenClass,
    gridColumns: 12,
    gutterWidth,
    maxScreenClass: SizeEnum.XXL as ScreenClass,
  };
}
