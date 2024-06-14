import { ModeEnum } from './modes';
import { BackgroundsType } from './backgrounds';
import { BordersType } from './borders';
import { ButtonsType } from './buttons';
import { ColorsType } from './colors';
import { FontsType } from './fonts';
import { GridType } from './grid';
import { IconsType } from './icons';
import { IDEType } from './ide';
import { InputsType } from './inputs';
import { MarginType } from './margin';
import { MenuType } from './menus';
import { PaddingType } from './padding';
import { ScrollbarsType } from './scrollbars';

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
  grid: GridType;
  icons: IconsType;
  ide: IDEType;
  inputs: InputsType;
  margin: MarginType;
  menus: MenuType;
  padding: PaddingType;
  scrollbars: ScrollbarsType;
}
