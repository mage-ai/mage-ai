import { PaddingVerticalEnum } from './interactive';

export interface ButtonsType {
  padding: {
    base: string;
    sm: string;
  };
}

export default function build(): ButtonsType {
  return {
    padding: {
      base: `${PaddingVerticalEnum.BASE} 14px`,
      sm: `${PaddingVerticalEnum.SM} 13px`,
    },
  };
}
