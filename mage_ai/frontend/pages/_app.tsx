import React, {
  useEffect,
  useMemo,
  useRef,
} from 'react';
import App, { AppProps } from 'next/app';
import Cookies from 'js-cookie';
import LoadingBar from 'react-top-loading-bar';
import dynamic from 'next/dynamic';
import { GridThemeProvider } from 'styled-bootstrap-grid';
import { ThemeProvider } from 'styled-components';

import 'react-toastify/dist/ReactToastify.min.css';
import '@styles/globals.css';
import AuthToken from '@api/utils/AuthToken';
import Head from '@oracle/elements/Head';
import KeyboardContext from '@context/Keyboard';
import ToastWrapper from '@components/Toast/ToastWrapper';
import api from '@api';
import useGlobalKeyboardShortcuts from '@utils/hooks/keyboardShortcuts/useGlobalKeyboardShortcuts';
import { ErrorProvider } from '@context/Error';
import { LOCAL_STORAGE_KEY_HIDE_PUBLIC_DEMO_WARNING } from '@storage/constants';
import { ModalProvider } from '@context/Modal';
import { RED } from '@oracle/styles/colors/main';
import {
  REQUIRE_USER_AUTHENTICATION,
  REQUIRE_USER_AUTHENTICATION_COOKIE_KEY,
  REQUIRE_USER_AUTHENTICATION_COOKIE_PROPERTIES,
} from '@utils/session';
import { SheetProvider } from '@context/Sheet/SheetProvider';
import { ThemeType } from '@oracle/styles/themes/constants';
import { getCurrentTheme } from '@oracle/styles/themes/utils';
import {
  gridTheme as gridThemeDefault,
  theme as stylesTheme,
} from '@styles/theme';
import { queryFromUrl, queryString, redirectToUrl } from '@utils/url';

const Banner = dynamic(() => import('@oracle/components/Banner'), { ssr: false });

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

  const windowIsDefined = typeof window !== 'undefined';
  const isDemoApp = useMemo(() =>
    windowIsDefined && window.location.hostname === 'demo.mage.ai',
    [windowIsDefined],
  );
  const val = Cookies.get(
    REQUIRE_USER_AUTHENTICATION_COOKIE_KEY,
    REQUIRE_USER_AUTHENTICATION_COOKIE_PROPERTIES,
  );
  const noValue = typeof val === 'undefined' || val === null || !REQUIRE_USER_AUTHENTICATION();
  const { data } = api.statuses.list({}, {}, { pauseFetch: !noValue });
  const requireUserAuthentication =
    useMemo(() => data?.statuses?.[0]?.require_user_authentication, [data]);
  const { data: dataProjects } = api.projects.list({}, { revalidateOnFocus: false });

  useEffect(() => {
    if (noValue &&
      typeof requireUserAuthentication !== 'undefined' &&
      requireUserAuthentication !== null
    ) {
      Cookies.set(
        REQUIRE_USER_AUTHENTICATION_COOKIE_KEY,
        requireUserAuthentication,
        REQUIRE_USER_AUTHENTICATION_COOKIE_PROPERTIES,
      );
    }

    const loggedIn = AuthToken.isLoggedIn();
    if ((requireUserAuthentication && !loggedIn) || dataProjects?.error?.code === 401) {
      const currentPath = windowIsDefined ? window.location.pathname : null;
      if ('/sign-in' !== currentPath) {
        const query = {
          ...queryFromUrl(),
          redirect_url: currentPath,
        };
        redirectToUrl(`/sign-in?${queryString(query)}`);
      }
    }
  }, [
    dataProjects,
    noValue,
    requireUserAuthentication,
    windowIsDefined,
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
              <ErrorProvider>
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

                {isDemoApp && (
                  <Banner
                    linkProps={{
                      href: 'https://github.com/mage-ai/mage-ai',
                      label: 'GET MAGE',
                    }}
                    localStorageHideKey={LOCAL_STORAGE_KEY_HIDE_PUBLIC_DEMO_WARNING}
                    textProps={{
                      message: 'Public demo. Do not add private credentials.',
                      warning: true,
                    }}
                  />
                )}
              </ErrorProvider>
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
