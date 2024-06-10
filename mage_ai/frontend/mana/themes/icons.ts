import { ColorsType } from './colors';

export enum IconSizeEnum {
  BASE = 20,
  SM = 17,
}

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
      base: IconSizeEnum.BASE,
      sm: IconSizeEnum.SM,
    },
  };
}
