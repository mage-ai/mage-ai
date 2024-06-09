export enum MarginEnum {
  BASE = 12,
}

export interface MarginType {
  base: number;
}
export default function build(): MarginType {
  return {
    base: MarginEnum.BASE,
  };
}
