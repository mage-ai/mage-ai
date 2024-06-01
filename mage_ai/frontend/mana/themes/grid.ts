import { ScreenClass } from 'react-grid-system';
import { SizeEnum } from './sizes';
import { UNIT } from './spaces';

export function gridSystemConfiguration() {
  return {
    breakpoints: [576, 768, 992, 1200, 1600, 1920],
    containerWidths: [540, 740, 960, 1140, 1540, 1810],
    defaultScreenClass: SizeEnum.XXL as ScreenClass,
    gridColumns: 24,
    gutterWidth: UNIT * 7, // 14 on each side, 28 total
    maxScreenClass: SizeEnum.XXL as ScreenClass,
  };
}
