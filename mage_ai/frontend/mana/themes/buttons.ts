import { ColorsType } from './colors';

export interface ButtonsType {
  background: string;
  padding: string;
}

export default function build(colors: ColorsType): ButtonsType {
  return {
    background: colors.backgrounds.button,
    padding: '13px 14px',
  };
}
