import { AppSubtypeEnum, AppTypeEnum } from '../constants';

export default function appLoader(appType: AppTypeEnum, appSubtype: AppSubtypeEnum) {
  const mapping = {
    [AppTypeEnum.BROWSER]: {
      [AppSubtypeEnum.SYSTEM]: null,
    },
    [AppTypeEnum.EDITOR]: {
      [AppSubtypeEnum.IDE]: import('../Editor/useEditorAppNode').then(module => module.default),
    },
  };
  return mapping?.[appType]?.[appSubtype] || {};
}
