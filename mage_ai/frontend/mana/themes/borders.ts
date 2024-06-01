import { ColorsType } from './colors';

export interface BordersType {
  color: string;
  radius: number;
  style: string;
  width: number;
}

export default function build(colors: ColorsType): BordersType {
  return {
    color: colors.gray,
    radius: 10,
    style: 'solid',
    width: 1,
  };
}
