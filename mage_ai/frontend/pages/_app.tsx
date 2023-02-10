import React, {
  useEffect,
  useMemo,
  useRef,
} from 'react';
import App, { AppProps } from 'next/app';
import LoadingBar from 'react-top-loading-bar';
import { GridThemeProvider } from 'styled-bootstrap-grid';
import { ThemeProvider } from 'styled-components';

import 'react-toastify/dist/ReactToastify.min.css';
import '@styles/globals.css';
import Head from '@oracle/elements/Head';
import KeyboardContext from '@context/Keyboard';
import ToastWrapper from '@components/Toast/ToastWrapper';
import useGlobalKeyboardShortcuts from '@utils/hooks/keyboardShortcuts/useGlobalKeyboardShortcuts';
import { ModalProvider } from '@context/Modal';
import { RED } from '@oracle/styles/colors/main';
import { SheetProvider } from '@context/Sheet/SheetProvider';
import { ThemeType } from '@oracle/styles/themes/constants';
import { getCurrentTheme } from '@oracle/styles/themes/utils';
import {
  gridTheme as gridThemeDefault,
  theme as stylesTheme,
} from '@styles/theme';

type AppInternalProps = {
  defaultTitle?: string;
  themeProps?: {
    currentTheme?: any;
  };
  title?: string;
  version: number;
};

type MyAppProps = {
  currentTheme: ThemeType;
  pageProps: AppInternalProps;
  router: any;
};

function MyApp(props: MyAppProps & AppProps) {
  const refLoadingBar = useRef(null);
  const keyMapping = useRef({});
  const keyHistory = useRef([]);

  const {
    Component,
    currentTheme,
    pageProps,
    router,
  } = props;
  const {
    defaultTitle,
    themeProps = {},
    title,
    version = 1,
  } = pageProps;

  useEffect(() => {
    const handleRouteChangeComplete = (url: URL) => {
      refLoadingBar?.current?.complete?.();
    };

    const handleRouteChangeStart = () => {
      // @ts-ignore
      keyHistory.current = {};
      // @ts-ignore
      keyMapping.current = {};
      refLoadingBar?.current?.continuousStart?.();
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
    };
  }, [
    keyHistory,
    keyMapping,
    router.events,
  ]);

  const {
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    registerOnKeyUp,
    setDisableGlobalKeyboardShortcuts,
    unregisterOnKeyDown,
    unregisterOnKeyUp,
  } = useGlobalKeyboardShortcuts(keyMapping, keyHistory);
  const keyboardContextValue = useMemo(() => ({
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    registerOnKeyUp,
    setDisableGlobalKeyboardShortcuts,
    unregisterOnKeyDown,
    unregisterOnKeyUp,
  }), [
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    registerOnKeyUp,
    setDisableGlobalKeyboardShortcuts,
    unregisterOnKeyDown,
    unregisterOnKeyUp,
  ]);

  return (
    <KeyboardContext.Provider value={keyboardContextValue}>
      <ThemeProvider
        theme={Object.assign(
          stylesTheme,
          themeProps?.currentTheme || currentTheme,
        )}
      >
        <GridThemeProvider gridTheme={gridThemeDefault}>
          <ModalProvider>
            <SheetProvider>
              <Head
                defaultTitle={defaultTitle}
                title={title}
              >
                <meta
                  content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=0"
                  name="viewport"
                />
              </Head>

              <LoadingBar color={RED} ref={refLoadingBar} />

              {/* @ts-ignore */}
              <Component {...pageProps} />
            </SheetProvider>
          </ModalProvider>
        </GridThemeProvider>
        <ToastWrapper />
      </ThemeProvider>
    </KeyboardContext.Provider>
  );
}

MyApp.getInitialProps = async (appContext) => {
  const appProps = await App.getInitialProps(appContext);
  const { ctx } = appContext;

  return {
    ...appProps,
    currentTheme: getCurrentTheme(ctx),
  };
};

export default MyApp;
