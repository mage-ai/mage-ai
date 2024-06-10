export enum MarginEnum {
  BASE = 12,
  SM = 8,
  XS = 4,
}

export interface MarginType {
  base: number;
  sm: number;
  xs: number;
}

export default function build(): MarginType {
  return {
    base: MarginEnum.BASE,
    sm: MarginEnum.SM,
    xs: MarginEnum.XS,
  };
}
