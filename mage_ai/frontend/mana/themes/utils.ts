// @ts-ignore
import Cookies from 'js-cookie';
import ServerCookie from 'next-cookies';

import ThemeType, { ThemeSettingsType } from './interfaces';
import buildTheme from './build';
import { ModeEnum } from './modes';
import { SHARED_OPTS } from '@api/utils/token';

const KEY: 'theme_settings' = 'theme_settings';

function getThemeSettingsCache(ctx?: any): ThemeSettingsType {
  let themeSettings: ThemeSettingsType | string | undefined | null = null;

  if (ctx) {
    const cookie = ServerCookie(ctx);
    if (typeof cookie !== 'undefined') {
      themeSettings = cookie[KEY];
    }
  } else {
    themeSettings = Cookies.get(KEY);
  }

  if (typeof themeSettings === 'string') {
    themeSettings = JSON.parse(decodeURIComponent(themeSettings));
  }

  if (
    typeof themeSettings !== 'undefined' &&
    themeSettings !== null &&
    typeof themeSettings !== 'string'
  ) {
    return themeSettings;
  }

  return (themeSettings || {}) as ThemeSettingsType;
}

export function getTheme(opts?: { theme?: ThemeSettingsType; ctx?: any }): ThemeType {
  return buildTheme(opts?.theme || getThemeSettingsCache(opts?.ctx));
}

export function getThemeSettings(ctx?: any): ThemeSettingsType {
  const settings = getThemeSettingsCache(ctx);
  return {
    ...settings,
    mode: settings.mode || ModeEnum.DARK,
    theme: getTheme({
      ctx,
      theme: settings,
    }),
  };
}

export function setThemeSettings(
  themeSettings: ThemeSettingsType | ((prev: ThemeSettingsType) => ThemeSettingsType),
) {
  const theme = JSON.stringify(
    typeof themeSettings === 'function' ? themeSettings(getThemeSettings()) : themeSettings,
  );

  // @ts-ignore
  Cookies.set(KEY, theme, { ...SHARED_OPTS, expires: 9999 });
}
