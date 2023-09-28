import React, { Component } from 'react';
import ServerCookie from 'next-cookies';
import { NextPageContext } from 'next';

import AuthToken from '@api/utils/AuthToken';
import { COOKIE_KEY } from '@api/utils/token';
import { LOCAL_STORAGE_KEY_THEME } from '@oracle/styles/themes/utils';
import { REQUIRE_USER_AUTHENTICATION, getGroup } from '@utils/session';
import { queryString, redirectToUrl } from '@utils/url';

export type AuthProps = {
  currentGroupId?: number | string;
  token: string;
};

export default function PrivateRoute(WrappedComponent: any) {
  return class extends Component<AuthProps> {
    state = {
      auth: new AuthToken(this.props.token),
    };

    static async getInitialProps(ctx: NextPageContext) {
      const cookie = ServerCookie(ctx);
      const { id: currentGroupId }: { id?: string | undefined } = getGroup(ctx);
      const token: string | undefined = cookie[COOKIE_KEY];
      const theme = cookie[LOCAL_STORAGE_KEY_THEME];
      const auth = new AuthToken(token);
      const initialProps = {
        ...ctx, auth, currentGroupId, theme,
      };

      if (REQUIRE_USER_AUTHENTICATION(ctx) && auth.isExpired) {
        console.log('OAuth token has expired.');
        const query = {
          ...ctx.query,
          redirect_url: ctx.asPath,
        };
        redirectToUrl(`/sign-in?${queryString(query)}`, ctx.res);
      }

      // if (!currentGroupId && !ctx.asPath.startsWith('/groups')) {
      //   redirectToUrl('/groups', ctx.res);
      // }

      if (WrappedComponent.getInitialProps) {
        const wrappedProps = await WrappedComponent.getInitialProps(initialProps);
        // make sure our `auth: AuthToken` is always returned
        return {
          ...wrappedProps, auth, currentGroupId, theme,
        };
      }
      return initialProps;
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
      const { auth, ...propsWithoutAuth } = this.props;
      return <WrappedComponent auth={this.state.auth} {...propsWithoutAuth} />;
    }
  };
}
