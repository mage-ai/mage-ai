export interface ButtonsType {
  padding: {
    base: string;
    sm: string;
  };
}

export default function build(): ButtonsType {
  return {
    padding: {
      base: '13px 14px',
      sm: '12px 13px',
    },
  };
}
