// @ts-ignore
import Cookies from 'js-cookie';

import {
  COOKIE_DOMAIN,
  COOKIE_KEY_REF as COOKIE_KEY_REF_ORIG,
  COOKIE_PATH,
  SHARED_COOKIE_PROPERTIES,
} from '@utils/cookies/constants';

export const COOKIE_KEY: string = 'oauth_token';
export const COOKIE_KEY_REF: string = COOKIE_KEY_REF_ORIG;
export const DOMAIN: string = COOKIE_DOMAIN;
export const PATH: string = COOKIE_PATH;
export const SHARED_OPTS: any = SHARED_COOKIE_PROPERTIES;

export function getToken(): string | undefined {
  return Cookies.get(COOKIE_KEY, SHARED_OPTS);
}

export function removeToken() {
  Cookies.remove(COOKIE_KEY, SHARED_OPTS);
}

export function setToken(token: string) {
  Cookies.set(COOKIE_KEY, token, { ...SHARED_OPTS, expires: 30 });
}
