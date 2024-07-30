export interface HeaderType {
  base: {
    height: number;
  };
}

export default function build(): HeaderType {
  return {
    base: {
      height: 52,
    },
  };
}
