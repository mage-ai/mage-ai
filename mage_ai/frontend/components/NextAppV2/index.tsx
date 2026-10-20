import { AppProps } from 'next/app';
import { ThemeProvider } from 'styled-components';
import { useEffect } from 'react';

import Head from '@mana/elements/Head';
import ThemeType from '@mana/themes/interfaces';
import { LayoutVersionEnum } from '@utils/layouts';
import { ThemeSettingsType } from '@mana/themes/interfaces';
import { getTheme, getThemeSettings } from '@mana/themes/utils';
import { ModeEnum } from '@mana/themes/modes';

function NextAppV2({
  Component,
  pageProps,
}: AppProps & {
  pageProps: {
    defaultTitle?: string;
    title?: string;
    themeSettings?: Record<string, ThemeSettingsType>;
    version?: LayoutVersionEnum;
  };
}) {
  const {
    defaultTitle,
    themeSettings: themeSettingsProp,
    title,
    version,
  } = pageProps || ({} as any);

  const themeSettings = (themeSettingsProp?.[version] || getThemeSettings()) as ThemeSettingsType;
  const theme = themeSettings?.theme || getTheme({ theme: themeSettings });
  const mode = themeSettings?.mode || ModeEnum.DARK;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.removeAttribute('data-theme');
      document.body.setAttribute('data-theme', mode);
    }
  }, [mode]);

  return (
    <>
      <Head defaultTitle={defaultTitle} title={title}>
        <meta
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=0"
          name="viewport"
        />
      </Head>
      <ThemeProvider theme={theme as ThemeType}>
        <Component />
      </ThemeProvider>
    </>
  );
}

export default NextAppV2;
