import React, { Component } from 'react';
import { NextPageContext } from 'next';

import { LayoutVersionEnum } from '@utils/layouts';
import { ModeEnum } from '@mana/themes/modes';
import { ThemeSettingsType } from '@mana/themes/interfaces';
import { getThemeSettings } from '@mana/themes/utils';

import ServerCookie from 'next-cookies';

import AuthToken from '@api/utils/AuthToken';
import { COOKIE_KEY } from '@api/utils/token';
import { REQUIRE_USER_AUTHENTICATION } from '@utils/session';
import { queryString, redirectToUrl } from '@utils/url';
import { ignoreKeys } from '@utils/hash';

export type AuthProps = {
  mode: ModeEnum;
  themes: {
    [version: string]: ThemeSettingsType;
  };
  token: string;
  version: LayoutVersionEnum;
};

export default function Route(WrappedComponent: any) {
  return class extends Component<AuthProps> {
    state = {
      auth: new AuthToken(this.props.token),
    };

    static async getInitialProps(ctx: NextPageContext) {
      const cookie = ServerCookie(ctx);
      const token: string | undefined = cookie[COOKIE_KEY];
      const auth = new AuthToken(token);

      const version = LayoutVersionEnum.V2;
      const themeSettings = getThemeSettings(ctx);

      const themeProps = {
        mode: themeSettings?.mode,
        themeSettings: {
          [version]: themeSettings,
        },
        version,
      };
      const initialProps = {
        ...ctx,
        auth,
      };

      // if (REQUIRE_USER_AUTHENTICATION(ctx) && auth.isExpired) {
      //   console.log('OAuth token has expired.');
      //   const query = {
      //     ...ctx.query,
      //     redirect_url: ctx.asPath,
      //   };
      //   redirectToUrl(`/sign-in?${queryString(query)}`, ctx.res);
      // }

      if (WrappedComponent.getInitialProps) {
        const wrappedProps = await WrappedComponent.getInitialProps(initialProps);
        // make sure our `auth: AuthToken` is always returned
        return {
          ...themeProps,
          ...wrappedProps,
          auth,
        };
      }
      return {
        ...themeProps,
        ...initialProps,
      };
    }

    componentDidMount(): void {
      // since getInitialProps returns our props after they've JSON.stringify
      // we need to reinitialize it as an AuthToken to have the full class
      // with all instance methods available
      this.setState({ auth: new AuthToken(this.props.token) });
    }

    render() {
      // we want to hydrate the WrappedComponent with a full instance method of
      // AuthToken, the existing props.auth is a flattened auth, we want to use
      // the state instance of auth that has been rehydrated in browser after mount
      // @ts-ignore
      return (
        <WrappedComponent auth={this.state.auth} {...ignoreKeys(this.props, ['auth'])} />
      );
    }
  };
}
