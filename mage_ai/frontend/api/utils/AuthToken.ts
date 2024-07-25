import jwtDecode from 'jwt-decode';
import ls from 'local-storage';

import { COOKIE_PATH } from '@utils/cookies/constants';
import {
  CURRENT_USER_LOCAL_STORAGE_KEY,
  getCurrentUserLocalStorageKey,
  removeUser,
} from '@utils/session';
import { getToken, removeToken, setToken } from './token';
import { isJsonString } from '@utils/string';
import { redirectToUrl } from '@utils/url';

export type DecodedToken = {
  readonly expires: number;
  readonly token: string;
};

export default class AuthToken {
  readonly decodedToken: DecodedToken;

  constructor(readonly token?: string) {
    this.decodedToken = {
      expires: 0,
      token: null,
    };

    try {
      if (token) {
        this.decodedToken = jwtDecode(token);
      } else {
        this.decodedToken = jwtDecode(getToken());
      }
    } catch (e) {
    }
  }

  get authorizationString() {
    if (this.decodedToken.token) {
      return `Bearer ${this.decodedToken.token}`;
    }
  }

  get expiresAt(): Date {
    return new Date(this.decodedToken.expires * 1000);
  }

  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  get isValid(): boolean {
    return this.decodedToken.token && !this.isExpired;
  }

  static isLoggedIn() {
    const authToken = new AuthToken();
    return authToken.isValid;
  }

  static async storeToken(
    token: string,
    callback: any = null,
    basePath: string = COOKIE_PATH,
  ) {
    setToken(token, basePath);
    if (callback) {
      await callback();
    }
  }

  static async logout(
    callback: any = null,
    basePath: string = COOKIE_PATH,
  ) {
    const localStorageItems = typeof window !== 'undefined'
    ? window.localStorage
    : {} as { [key: string]: string };
    const currentUserLocalStorageKey = getCurrentUserLocalStorageKey(basePath);
    const otherUserLocalStorageItems = Object.entries(localStorageItems).filter(
      ([key, _]) => key.endsWith(CURRENT_USER_LOCAL_STORAGE_KEY) && key !== currentUserLocalStorageKey);

    // @ts-ignore
    ls.clear();

    // Put back user profiles in local storage for other accounts that may be logged into Mage
    // on different clusters in the same browser (same domain, but different base paths).
    otherUserLocalStorageItems.forEach(([key, val]) => {
      const parsedVal = isJsonString(val) ? JSON.parse(val) : val;
      // @ts-ignore
      ls.set(key, parsedVal);
    });
    removeUser(basePath);
    removeToken(basePath);

    try {
      if (callback) {
        await callback();
      } else {
        await redirectToUrl('/sign-in');
      }
    } catch {
      console.log('Sign out error.');
    }
  }

  logout = AuthToken.logout;
}
