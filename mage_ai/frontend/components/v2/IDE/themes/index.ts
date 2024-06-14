import base from './base';
import light from './light';
import IDEThemeType, { IDEThemeEnum } from './interfaces';
import ThemeType from '@mana/themes/interfaces';

const themes: { [key: string]: IDEThemeType } = {
  [IDEThemeEnum.BASE]: base,
  [IDEThemeEnum.LIGHT]: light,
};

export default function buildThemes(theme: ThemeType): Record<IDEThemeEnum, IDEThemeType> {
  return Object.entries(themes).reduce((acc, [key, build]) => ({
    ...acc,
    [key as IDEThemeEnum]: build(theme),
  }), {} as IDEThemeType);
}
