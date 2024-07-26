import { ColorsType } from './colors';
import { ModeType } from './modes';

export enum BorderRadius {
  BASE = '12px',
  ROUND = '40px',
  SM = '6px',
  XS = '2px',
}

export interface BordersType {
  color: {
    base: {
      default: ModeType;
      hover: ModeType;
    };
  };
  outline: {
    offset: number;
    width: number;
  };
  radius: {
    base: string;
    round: string;
    sm: string;
    xs: string;
  };
  style: string;
  width: string;
}

export default function build(colors: ColorsType): BordersType {
  return {
    color: colors.borders,
    outline: {
      offset: 1,
      width: 2,
    },
    radius: {
      base: BorderRadius.BASE,
      round: BorderRadius.ROUND,
      sm: BorderRadius.SM,
      xs: BorderRadius.XS,
    },
    style: 'solid',
    width: '1px',
  };
}
