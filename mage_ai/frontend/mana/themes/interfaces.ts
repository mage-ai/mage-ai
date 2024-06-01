import { ColorsType } from './colors';
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
  borders: ValueMappingType;
  colors: ColorsType;
  padding: PaddingType;
}
