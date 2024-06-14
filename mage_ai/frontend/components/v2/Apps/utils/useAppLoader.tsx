import { AppSubtypeEnum, AppTypeEnum } from '../constants';

export default function appLoader(appType: AppTypeEnum, appSubtype: AppSubtypeEnum) {
  const mapping = {
    [AppTypeEnum.BROWSER]: {
      [AppSubtypeEnum.SYSTEM]: import('../Browser/useApp').then(module => module.default),
    },
    [AppTypeEnum.EDITOR]: {
      [AppSubtypeEnum.IDE]: import('../Editor/useApp').then(module => module.default),
    },
  };
  return mapping?.[appType]?.[appSubtype] || {};
}
