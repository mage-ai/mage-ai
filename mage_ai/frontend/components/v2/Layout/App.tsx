import ContextProvider from '@context/v2/ContextProvider';
import Head from '@mana/elements/Head';
import HeaderPortal from '@context/v2/Layout/Header/Portal';
import ThemeType from '@mana/themes/interfaces';
import { AppProps } from 'next/app';

import { LayoutVersionEnum } from '@utils/layouts';
import { MenuProvider } from '@context/v2/Menu';
import { ModeEnum } from '@mana/themes/modes';
import { ThemeProvider } from 'styled-components';
import { ThemeSettingsType } from '@mana/themes/interfaces';
import { getTheme, getThemeSettings } from '@mana/themes/utils';
import { useEffect, useRef } from 'react';

function App({
  Component,
  pageProps: {
    defaultTitle,
    mode: modeProp,
    themeSettings: themeSettingsProp,
    title,
    version,
    ...rest
  },
  router,
}: AppProps & {
  pageProps: {
    defaultTitle?: string;
    mode?: ModeEnum;
    title?: string;
    themeSettings?: Record<string, ThemeSettingsType>;
    version?: LayoutVersionEnum;
  };
}) {
  const headerRef = useRef(null);

  const themeSettings = (themeSettingsProp?.[version] || getThemeSettings()) as ThemeSettingsType;
  const theme = themeSettings?.theme || getTheme({ theme: themeSettings });
  const mode = themeSettings?.mode || modeProp || ModeEnum.DARK;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.removeAttribute('data-theme');
      document.body.setAttribute('data-theme', mode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Head defaultTitle={defaultTitle} title={title}>
        <meta
          content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=0"
          name="viewport"
        />
      </Head>

      <ThemeProvider theme={theme}>
        <MenuProvider>
          <ContextProvider main router={router} theme={theme as ThemeType}>
            <HeaderPortal headerRef={headerRef} />
            <Component {...rest} />
          </ContextProvider>
        </MenuProvider>
      </ThemeProvider>
    </>
  );
}

export default App;
