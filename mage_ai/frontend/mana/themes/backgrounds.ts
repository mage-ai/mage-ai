import { ColorsType } from './colors';

export interface BackgroundsType {
  body: string;
  button: string;
}

export default function build(colors: ColorsType): BackgroundsType {
  console.log(colors);
  return {
    body: colors.backgrounds.body,
    button: colors.backgrounds.button,
  };
}
