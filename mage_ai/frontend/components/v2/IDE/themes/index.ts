import base from './base';
import IDEThemeType, { IDEThemeEnum } from './interfaces';

const themes: { [key: string]: IDEThemeType } = {
  [IDEThemeEnum.BASE]: base,
};

export default themes;
