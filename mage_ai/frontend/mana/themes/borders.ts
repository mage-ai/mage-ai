import { ColorsType } from './colors';

export enum BorderRadius {
  BASE = '10px',
  ROUND = '40px',
}

export interface BordersType {
  color: string;
  outline: {
    offset: number;
    width: number;
  };
  radius: {
    base: string;
    round: string;
  };
  style: string;
  width: string;
}

export default function build(colors: ColorsType): BordersType {
  return {
    color: colors.gray,
    outline: {
      offset: 1,
      width: 2,
    },
    radius: {
      base: BorderRadius.BASE,
      round: BorderRadius.ROUND,
    },
    style: 'solid',
    width: '1px',
  };
}
