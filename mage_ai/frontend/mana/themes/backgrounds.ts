import { BackgroundsType as ColorsBackgroundType, ColorsType } from './colors';

export type BackgroundsType = ColorsBackgroundType;

export default function build(colors: ColorsType): BackgroundsType {
  return colors.backgrounds;
}
