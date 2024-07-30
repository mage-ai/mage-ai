import Header from './Header';
import { ThemeSettingsType } from '@mana/themes/interfaces';
import { HeaderProps } from './Header/interfaces';
import React, { useCallback, useRef, useState } from 'react';
import ThemeType from '@mana/themes/interfaces';
import { FaviconStatusEnum, changeFavicon } from './favicon';
import { LayoutContext, LayoutContextType, PageProps } from './LayoutContext';
import { Root, createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { useMenuContext } from '../Menu';
import { RouteType } from '@mana/shared/interfaces';
import { selectKeys } from '@utils/hash';

interface LayoutProviderProps {
  children: React.ReactNode;
  router?: any;
  theme?: ThemeType;
  updateThemeSettings: LayoutContextType['updateThemeSettings'];
}

export const LayoutProvider = ({ children, router, theme, updateThemeSettings }: LayoutProviderProps) => {
  const [headerPortalRef, setHeaderPortalRef] = useState(null);
  const [headerData, setHeaderData] = useState<HeaderProps>({} as HeaderProps);

  const [headerContainerRef, setHeaderContainerRef] =
    useState<React.RefObject<HTMLDivElement>>(null);
  const useMenu = useMenuContext();
  const headerRootRef = useRef<Root>(null);
  const headerRef = useRef<HeaderProps>(headerData);
  const pageRef = useRef<PageProps>({ title: null });

  const [routeHistory, setRouteHistory] = useState<RouteType[]>([]);
  const routeHistoryRef = useRef<RouteType[]>([]);
  const appRouteBackwardsRef = useRef<RouteType>(null);

  function initialize({ headerRef, page }) {
    setHeaderPortalRef(headerRef);
  }

  function setHeader(kwargs: HeaderProps) {
    const version = 'version' in kwargs ? kwargs.version : (headerRef?.current?.version ?? 0) + 1;

    headerRef.current = {
      ...headerRef.current,
      ...kwargs,
      version,
    };

    setHeaderData(headerRef.current);
  }

  const changeRoute = useCallback((appRoute?: RouteType, opts?: {
    appendOnly?: boolean;
    transitionOnly?: boolean;
  }) => {
    const { appendOnly, transitionOnly } = opts ?? {};

    if (!appRoute) {
      // Remove 1, then use the new last one.
      routeHistoryRef.current = routeHistoryRef.current.slice(0, routeHistoryRef.current.length - 1);

      const appRoute = routeHistoryRef.current[routeHistoryRef.current.length - 1];
      appRouteBackwardsRef.current = appRoute;

      if (!appRoute) {
        return;
      }

      const { route } = appRoute;
      router.replace({
        pathname: route.pathname,
        query: route.params,
      }, route.href);


      setRouteHistory(routeHistoryRef.current);
      return;
    }

    if (transitionOnly || !appendOnly) {
      const { route } = appRoute;
      router.replace({
        pathname: route.pathname,
        query: route.params,
      }, route.href);
    }

    if (appRouteBackwardsRef.current) {
      appRouteBackwardsRef.current = null;
      return;
    } else if (appendOnly || !transitionOnly) {
      routeHistoryRef.current.push({
        ...appRoute,
        timestamp: Number(new Date()),
      });
      setRouteHistory(routeHistoryRef.current);
    }
  }, []);

  function setPage(
    page: PageProps & {
      busy?: boolean;
      error?: boolean;
      notice?: boolean;
      success?: boolean;
    },
  ) {
    if ([
      'busy',
      'error',
      'notice',
      'success',
    ].some(key => key in (page ?? {}))) {
      const status = page?.busy
        ? FaviconStatusEnum.BUSY
        : page?.error
          ? FaviconStatusEnum.ERROR
          : page?.notice
            ? FaviconStatusEnum.NOTICE
            : page?.success
              ? FaviconStatusEnum.SUCCESS
              : undefined;

      if (status ?? false) {
        changeFavicon(`/images/favicons/${status}.png`);
      } else {
        changeFavicon('/images/favicons/pro.ico');
      }
    }

    if (page?.title) {
      document.title = page.title;
    }

    pageRef.current = page;
  }

  return (
    <LayoutContext.Provider
      value={{
        changeRoute,
        header: {
          ...headerRef.current,
          setHeader,
        },
        initialize,
        page: {
          ...pageRef.current,
          setPage,
        },
        updateThemeSettings,
      }}
    >
      {headerPortalRef?.current &&
        createPortal(
          <Header
            {...{
              ...headerRef?.current,
              ...headerData,
            }}
            routeHistory={routeHistory}
            router={router}
            updateThemeSettings={updateThemeSettings}
          />,
          headerPortalRef?.current,
        )}
      {children}
    </LayoutContext.Provider>
  );
};
