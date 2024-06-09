import React, { Component } from 'react';
import { NextPageContext } from 'next';

import { LayoutVersionEnum } from '@utils/layouts';
import { getTheme } from '@mana/themes/utils';
import { ThemeSettingsType } from '@mana/themes/interfaces';

export type RouteProps = {
  theme: ThemeSettingsType;
  version: LayoutVersionEnum;
};

export default function Route(WrappedComponent: any) {
  return class extends Component<RouteProps> {
    static async getInitialProps(ctx?: NextPageContext) {
      return {
        themes: {
          [LayoutVersionEnum.V2]: getTheme({ ctx }),
        },
        version: LayoutVersionEnum.V2,
      };
    }

    render() {
      return <WrappedComponent pageProps={this.props} />;
    }
  };
}
