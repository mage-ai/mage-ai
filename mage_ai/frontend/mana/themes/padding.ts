import { UNIT } from './spaces';

enum PaddingEnum {
  DEFAULT = UNIT * 3,
}

export interface PaddingType {
  base: number;
}

export default function build(): PaddingType {
  return {
    base: PaddingEnum.DEFAULT,
  };
}
