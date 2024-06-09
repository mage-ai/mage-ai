import { BordersType, ColorsType } from './colors';
import { PaddingVerticalEnum } from './interactive';

export interface ButtonsType {
  border: {
    color: BordersType['button'];
  };
  padding: {
    base: string;
    sm: string;
  };
}

export default function build(colors: ColorsType): ButtonsType {
  return {
    border: {
      color: colors.borders.button,
    },
    padding: {
      base: `${PaddingVerticalEnum.BASE} 14px`,
      sm: `${PaddingVerticalEnum.SM} 13px`,
    },
  };
}
