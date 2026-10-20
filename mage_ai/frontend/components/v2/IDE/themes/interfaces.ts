import { ModeEnum } from '@mana/themes/modes';

export enum IDEThemeEnum {
  BASE = 'materia-base',
  LIGHT = 'materia-light',
}

export const ModeEnumToThemeEnum = {
  [ModeEnum.DARK]: IDEThemeEnum.BASE,
  [ModeEnum.LIGHT]: IDEThemeEnum.LIGHT,
};

type IDEThemeType = {
  [key: string]: any;
};

export default IDEThemeType;
