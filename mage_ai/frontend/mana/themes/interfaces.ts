import { BackgroundsType } from './backgrounds';
import { BordersType } from './borders';
import { ButtonsType } from './buttons';
import { ColorsType } from './colors';
import { FontsType } from './fonts';
import { MarginType } from './margin';
import { ModeEnum } from './modes';
import { PaddingType } from './padding';

export enum ThemeTypeEnum {
  CUSTOM = 'custom',
  SYSTEM = 'system',
}

export interface ValueMappingType {
  [key: string]: number | string;
}

export interface ThemeSettingsType {
  mode?: ModeEnum;
  theme?: ThemeType;
  type?: ThemeTypeEnum;
}

export default interface ThemeType {
  backgrounds: BackgroundsType;
  borders: BordersType;
  buttons: ButtonsType;
  colors: ColorsType;
  fonts: FontsType;
  margin: MarginType;
  padding: PaddingType;
}
