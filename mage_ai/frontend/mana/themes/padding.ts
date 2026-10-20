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
