import jwtDecode from 'jwt-decode';
import ls from 'local-storage';

import { getToken, removeToken, setToken } from './token';
import { removeUser } from '@utils/session';
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

  static async storeToken(token: string, callback: any = null) {
    setToken(token);
    if (callback) {
      await callback();
    }
  }

  static async logout(callback: any = null) {
    // @ts-ignore
    ls.clear();
    removeUser();
    removeToken();

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
