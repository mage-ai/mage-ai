// @ts-ignore
import Cookies from 'js-cookie';
import ServerCookie from 'next-cookies';

import dark from '@oracle/styles/themes/dark';
import light from '@oracle/styles/themes/light';
import { SHARED_OPTS } from '@api/utils/token';

export const LOCAL_STORAGE_KEY_THEME: 'current_theme' = 'current_theme';
const LOCAL_STORAGE_KEY_THEME_DARK: number = 0;
const LOCAL_STORAGE_KEY_THEME_LIGHT: number = 1;

export function getCurrentTheme(ctx: any, invertedTheme = 1) {
  let currentTheme;

  if (ctx) {
    const cookie = ServerCookie(ctx);
    currentTheme = cookie[LOCAL_STORAGE_KEY_THEME];
  } else {
    currentTheme = Cookies.get(LOCAL_STORAGE_KEY_THEME);
  }

  if (Number(currentTheme) === invertedTheme) {
    if (invertedTheme === LOCAL_STORAGE_KEY_THEME_DARK) {
      return light;
    } else {
      return dark;
    }
  }

  if (invertedTheme === LOCAL_STORAGE_KEY_THEME_LIGHT) {
    return dark;
  } else {
    return light;
  }

  return dark;
}

export function getCurrentInvertedTheme(ctx) {
  return getCurrentTheme(ctx, LOCAL_STORAGE_KEY_THEME_DARK);
}

export function setCurrentTheme(theme) {
  // @ts-ignore
  Cookies.set(LOCAL_STORAGE_KEY_THEME, theme, { ...SHARED_OPTS, expires: 9999 });
}

export function toggleTheme() {
  const currentTheme = Cookies.get(LOCAL_STORAGE_KEY_THEME);

  return setCurrentTheme(
    Number(currentTheme) === LOCAL_STORAGE_KEY_THEME_DARK || currentTheme === null
      ? LOCAL_STORAGE_KEY_THEME_LIGHT
      : LOCAL_STORAGE_KEY_THEME_DARK,
  );
}
