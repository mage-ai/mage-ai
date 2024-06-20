import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import App, { AppProps } from 'next/app';
import Cookies from 'js-cookie';
import LoadingBar from 'react-top-loading-bar';
import dynamic from 'next/dynamic';
import { GoogleAnalytics } from '@next/third-parties/google';
import { GridThemeProvider } from 'styled-bootstrap-grid';
import { ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';

import 'react-toastify/dist/ReactToastify.min.css';
import '@styles/globals.css';
import AuthToken from '@api/utils/AuthToken';
import CommandCenter from '@components/CommandCenter';
import Head from '@oracle/elements/Head';
import KeyboardContext from '@context/Keyboard';
import ToastWrapper from '@components/Toast/ToastWrapper';
import api from '@api';
import useGlobalKeyboardShortcuts from '@utils/hooks/keyboardShortcuts/useGlobalKeyboardShortcuts';
import useProject from '@utils/models/project/useProject';
import useStatus from '@utils/models/status/useStatus';
import { CustomEventUUID } from '@utils/events/constants';
import { DEMO_GA_MEASUREMENT_ID } from '@utils/gtag';
import { ErrorProvider } from '@context/Error';
import { LOCAL_STORAGE_KEY_HIDE_PUBLIC_DEMO_WARNING } from '@storage/constants';
import { ModalProvider } from '@context/Modal';
import { RED } from '@oracle/styles/colors/main';
import {
  REQUIRE_USER_AUTHENTICATION,
  REQUIRE_USER_AUTHENTICATION_COOKIE_KEY,
  REQUIRE_USER_AUTHENTICATION_COOKIE_PROPERTIES,
  REQUIRE_USER_PERMISSIONS,
  REQUIRE_USER_PERMISSIONS_COOKIE_KEY,
  REQUIRE_USER_PERMISSIONS_COOKIE_PROPERTIES,
} from '@utils/session';
import { SheetProvider } from '@context/Sheet/SheetProvider';
import { ThemeType } from '@oracle/styles/themes/constants';
import { addPageHistory } from '@storage/CommandCenter/utils';
import { getCurrentTheme } from '@oracle/styles/themes/utils';
import {
  gridTheme as gridThemeDefault,
  theme as stylesTheme,
} from '@styles/theme';
import { isDemo } from '@utils/environment';
import { queryFromUrl, queryString, redirectToUrl } from '@utils/url';

const COMMAND_CENTER_ROOT_ID = 'command-center-root';

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
  const commandCenterRootRef = useRef(null);
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

  const {
    featureEnabled,
    featureUUIDs,
  } = useProject();
  const commandCenterEnabled = useMemo(() => featureEnabled?.(featureUUIDs?.COMMAND_CENTER), [
    featureEnabled,
    featureUUIDs,
  ]);

  const windowIsDefined = typeof window !== 'undefined';
  const isDemoApp = useMemo(() => isDemo(), []);

  const savePageHistory = useCallback(() => {
    if (commandCenterEnabled) {
      if (typeof document !== 'undefined') {
        addPageHistory({
          path: router?.asPath,
          pathname: router?.pathname,
          query: router?.query,
          title: document?.title,
        });
      }
    }
  }, [commandCenterEnabled, router]);

  useEffect(() => {
    setTimeout(() => savePageHistory(), 3000);
  }, [savePageHistory]);

  useEffect(() => {
    const handleRouteChangeComplete = (url: URL) => {
      refLoadingBar?.current?.complete?.();
      savePageHistory();
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
    savePageHistory,
  ]);

  useEffect(() => {
    const handleState = () => {
      if (!commandCenterRootRef?.current) {
        const domNode = document.getElementById(COMMAND_CENTER_ROOT_ID);
        commandCenterRootRef.current = createRoot(domNode);
      }
      if (commandCenterRootRef?.current) {
        commandCenterRootRef?.current?.render(
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
                      <CommandCenter router={router} />
                    </ErrorProvider>
                  </SheetProvider>
                </ModalProvider>
              </GridThemeProvider>
            </ThemeProvider>
          </KeyboardContext.Provider>,
        );
      }
    };

    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.addEventListener(CustomEventUUID.COMMAND_CENTER_ENABLED, handleState);
    }

    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.removeEventListener(CustomEventUUID.COMMAND_CENTER_ENABLED, handleState);
      }
    };
  }, []);

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

  const val = Cookies.get(
    REQUIRE_USER_AUTHENTICATION_COOKIE_KEY,
    REQUIRE_USER_AUTHENTICATION_COOKIE_PROPERTIES,
  );
  const noValue = typeof val === 'undefined' || val === null || !REQUIRE_USER_AUTHENTICATION();

  const valPermissions = Cookies.get(
    REQUIRE_USER_PERMISSIONS_COOKIE_KEY,
    REQUIRE_USER_PERMISSIONS_COOKIE_PROPERTIES,
  );
  const noValuePermissions = typeof valPermissions === 'undefined'
    || valPermissions === null
    || !REQUIRE_USER_PERMISSIONS();

  const { status } = useStatus({
    delay: 3000,
    pauseFetch: !noValue && !noValuePermissions,
  });

  const requireUserAuthentication =
    useMemo(() => status?.require_user_authentication, [status]);
  const requireUserPermissions =
    useMemo(() => status?.require_user_permissions, [status]);

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

    if (noValuePermissions &&
      typeof requireUserPermissions !== 'undefined' &&
      requireUserPermissions !== null
    ) {
      Cookies.set(
        REQUIRE_USER_PERMISSIONS_COOKIE_KEY,
        requireUserPermissions,
        REQUIRE_USER_PERMISSIONS_COOKIE_PROPERTIES,
      );
    }

    const loggedIn = AuthToken.isLoggedIn();
    if ((requireUserAuthentication && !loggedIn) || dataProjects?.error?.code === 401) {
      const path = windowIsDefined ? window.location.pathname : null;
      const currentPath = path && path.split('/').pop();
      if ('sign-in' !== currentPath && 'oauth' !== currentPath) {
        const query = {
          ...queryFromUrl(),
          redirect_url: path,
        };
        redirectToUrl(`/sign-in?${queryString(query)}`);
      }
    }
  }, [
    dataProjects,
    noValue,
    noValuePermissions,
    requireUserAuthentication,
    requireUserPermissions,
    windowIsDefined,
  ]);

  const shouldShowCommandCenter =
    useMemo(() => (!requireUserAuthentication || AuthToken.isLoggedIn()) && commandCenterEnabled, [
      commandCenterEnabled,
      requireUserAuthentication,
    ]);

  return (
    <>
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
                  {shouldShowCommandCenter && <CommandCenter />}
                  {!shouldShowCommandCenter && <div id={COMMAND_CENTER_ROOT_ID} />}
                </ErrorProvider>
              </SheetProvider>
            </ModalProvider>
          </GridThemeProvider>
          <ToastWrapper />
        </ThemeProvider>
      </KeyboardContext.Provider>

      {isDemoApp && (
        <GoogleAnalytics gaId={DEMO_GA_MEASUREMENT_ID} />
      )}
    </>
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
