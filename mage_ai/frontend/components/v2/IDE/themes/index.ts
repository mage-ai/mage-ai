import base from './base';
import light from './light';
import IDEThemeType, { IDEThemeEnum } from './interfaces';
import ThemeType from '@mana/themes/interfaces';

const themes: { [key: string]: IDEThemeType } = {
  [IDEThemeEnum.BASE]: base,
  [IDEThemeEnum.LIGHT]: light,
};

export default function buildThemes(theme: ThemeType): Record<IDEThemeEnum, IDEThemeType> {
  return Object.entries(themes).reduce(
    (acc, [key, build]: [string, (theme: ThemeType) => IDEThemeType]) => {
      const themeEnumKey = key as keyof typeof IDEThemeEnum; // This ensures that key is one of the enum keys
      if (IDEThemeEnum[themeEnumKey] !== undefined) {
        acc[IDEThemeEnum[themeEnumKey]] = build(theme) as IDEThemeType;
      }
      return acc;
    },
    {} as Record<IDEThemeEnum, IDEThemeType>,
  );
}
