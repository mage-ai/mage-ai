import base from './base';
import IDEThemeType, { IDEThemeEnum as IDEThemeEnumInit } from './interfaces';

export const IDEThemeEnum = IDEThemeEnumInit;

const themes: { [key: string]: IDEThemeType } = {
  [IDEThemeEnum.BASE]: base,
};

export default themes;
