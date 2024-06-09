import { ColorsType } from './colors';

export interface IconsType {
  color: {
    base: string;
    inverted: string;
  };
  size: {
    base: number;
    sm: number;
  };
}

export default function build(colors: ColorsType): IconsType {
  return {
    color: colors.icons,
    size: {
      base: 20,
      sm: 17,
    },
  };
}
