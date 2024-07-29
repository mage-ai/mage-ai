import dynamic from 'next/dynamic';

import { AppSubtypeEnum, AppTypeEnum } from '../constants';

export default async function appLoader(appType: AppTypeEnum, appSubtype: AppSubtypeEnum) {
  const mapping = {
    [AppTypeEnum.BROWSER]: {
      [AppSubtypeEnum.SYSTEM]: null,
    },
    [AppTypeEnum.EDITOR]: {
      [AppSubtypeEnum.IDE]: import('../Editor/useApp'),
    },
  };

  return mapping?.[appType]?.[appSubtype] || null;
}
