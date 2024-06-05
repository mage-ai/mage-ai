import base from './base';
import IDEThemeType, { IDEThemeEnum } from './interfaces';

export const NAMESPACE = 'materia';

const themes: { [key: string]: IDEThemeType } = {
  [IDEThemeEnum.BASE]: base,
};

export default themes;
