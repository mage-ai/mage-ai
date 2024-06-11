import React, { Component } from 'react';
import { NextPageContext } from 'next';

import { LayoutVersionEnum } from '@utils/layouts';
import { ModeEnum } from '@mana/themes/modes';
import { ThemeSettingsType } from '@mana/themes/interfaces';
import { getThemeSettings } from '@mana/themes/utils';

type RouteProps = {
  mode: ModeEnum;
  themes: {
    [version: string]: ThemeSettingsType;
  };
  version: LayoutVersionEnum;
};

export default function Route(WrappedComponent: any) {
  return class extends Component<RouteProps> {
    static async getInitialProps(ctx?: NextPageContext) {
      const version = LayoutVersionEnum.V2;
      const themeSettings = getThemeSettings(ctx);

      return {
        mode: themeSettings?.mode,
        themeSettings: {
          [version]: themeSettings,
        },
        version,
      };
    }

    render() {
      return <WrappedComponent pageProps={this.props} />;
    }
  };
}
