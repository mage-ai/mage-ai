import { ColorsType } from './colors';

export interface BordersType {
  color: string;
  outline: {
    offset: string;
    width: string;
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
      offset: '1px',
      width: '3px',
    },
    radius: {
      base: '10px',
      round: '40px',
    },
    style: 'solid',
    width: '1px',
  };
}
