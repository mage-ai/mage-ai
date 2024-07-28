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
import { getTheme, getThemeSettings, setThemeSettings } from '@mana/themes/utils';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

function App({
  Component,
  pageProps: {
    mode: modeProp,
    themeSettings: themeSettingsProp,
    title,
    version,
    ...rest
  },
  router,
}: AppProps & {
  pageProps: {
    mode?: ModeEnum;
    title?: string;
    themeSettings?: Record<string, ThemeSettingsType>;
    version?: LayoutVersionEnum;
  };
}) {
  // console.log('AppV2 render');

  const headerRef = useRef(null);

  const [themeSettings, setThemeSettingsState] = useState<ThemeSettingsType | null>(
    (themeSettingsProp?.[version] || getThemeSettings()) as ThemeSettingsType,
  );
  const updateThemeSettings = useCallback((settings: ThemeSettingsType) => {
    setThemeSettings(settings)
    setThemeSettingsState(settings);
  }, []);

  const theme = useMemo(() => themeSettings?.theme || getTheme({ theme: themeSettings }), [
    themeSettings,
  ]);
  const mode = useMemo(() => themeSettings?.mode || modeProp || ModeEnum.DARK, [
    modeProp,
    themeSettings,
  ]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.removeAttribute('data-theme');
      document.body.setAttribute('data-theme', mode);
    }
  }, [mode]);

  const headMemo = useMemo(() => <Head title={title ?? 'Mage Pro'} />, [title]);

  return (
    <>
      {headMemo}

      <ThemeProvider theme={theme}>
        <MenuProvider>
          <ContextProvider
            base
            main
            router={router} theme={theme as ThemeType}
            updateThemeSettings={updateThemeSettings}
          >
            <HeaderPortal headerRef={headerRef} />
            <Component {...rest} updateThemeSettings={updateThemeSettings} />
          </ContextProvider>
        </MenuProvider>
      </ThemeProvider>
    </>
  );
}

export default App;
