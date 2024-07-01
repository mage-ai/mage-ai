import ContextProvider from '@context/v2/ContextProvider';
import Head from '@mana/elements/Head';
import ThemeType from '@mana/themes/interfaces';
import { AppProps } from 'next/app';
import { LayoutVersionEnum } from '@utils/layouts';
import { ModeEnum } from '@mana/themes/modes';
import { ThemeSettingsType } from '@mana/themes/interfaces';
import { getTheme, getThemeSettings } from '@mana/themes/utils';
import { useEffect } from 'react';

function NextAppV2({
  Component,
  pageProps: {
    defaultTitle,
    mode: modeProp,
    themeSettings: themeSettingsProp,
    title,
    version,
    ...rest
  },
}: AppProps & {
  pageProps: {
    defaultTitle?: string;
    mode?: ModeEnum;
    title?: string;
    themeSettings?: Record<string, ThemeSettingsType>;
    version?: LayoutVersionEnum;
  };
}) {
  const themeSettings = (themeSettingsProp?.[version] || getThemeSettings()) as ThemeSettingsType;
  const theme = themeSettings?.theme || getTheme({ theme: themeSettings });
  const mode = themeSettings?.mode || modeProp || ModeEnum.DARK;

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
      <ContextProvider theme={theme as ThemeType}>
        <Component {...rest} />
      </ContextProvider>
    </>
  );
}

export default NextAppV2;
