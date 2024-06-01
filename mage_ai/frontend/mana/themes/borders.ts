import { ColorsType } from './colors';

export interface BordersType {
  color: string;
  radius: {
    base: number;
    round: number;
  };
  style: string;
  width: number;
}

export default function build(colors: ColorsType): BordersType {
  return {
    color: colors.gray,
    radius: {
      base: 10,
      round: 40,
    },
    style: 'solid',
    width: 1,
  };
}
