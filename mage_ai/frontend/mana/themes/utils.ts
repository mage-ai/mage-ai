// @ts-ignore
import Cookies from 'js-cookie';
import ServerCookie from 'next-cookies';

import ThemeType, { ThemeSettingsType, ThemeTypeEnum } from './interfaces';
import buildTheme from './build';
import { SHARED_OPTS } from '@api/utils/token';

const KEY: 'theme_settings' = 'theme_settings';

export function getThemeSettings(ctx?: any): ThemeSettingsType {
  let themeSettings: ThemeSettingsType | string | undefined | null = null;

  if (ctx) {
    const cookie = ServerCookie(ctx);
    if (typeof cookie !== 'undefined') {
      themeSettings = cookie[KEY];
    }
  } else {
    themeSettings = Cookies.get(KEY, SHARED_OPTS);
  }

  if (typeof themeSettings === 'string') {
    themeSettings = JSON.parse(themeSettings);
  }

  if (typeof themeSettings !== 'undefined' && themeSettings !== null && typeof themeSettings !== 'string') {
    return themeSettings;
  }

  return {};
}

export function getTheme(themeSettings?: ThemeSettingsType, ctx?: any): ThemeType {
  return buildTheme(themeSettings || getThemeSettings(ctx));
}

export function setThemeSettings(themeSetings: ThemeSettingsType) {
  // @ts-ignore
  Cookies.set(KEY, themeSetings, { ...SHARED_OPTS, expires: 9999 });
}
