export enum PaddingEnum {
  LG = 16,
  BASE = 12,
  SM = 8,
  XS = 4,
}

export interface PaddingType {
  base: number;
  sm: number;
  xs: number;
}

export default function build(): PaddingType {
  return {
    base: 12,
    sm: 8,
    xs: 4,
  };
}
