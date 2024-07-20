import Header from './Header';
import { HeaderProps } from './Header/interfaces';
import React, { useRef, useState } from 'react';
import ThemeType from '@mana/themes/interfaces';
import { FaviconStatusEnum, changeFavicon } from './favicon';
import { LayoutContext, PageProps } from './LayoutContext';
import { Root, createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { useMenuContext } from '../Menu';

interface LayoutProviderProps {
  children: React.ReactNode;
  router?: any;
  theme?: ThemeType;
}

export const LayoutProvider = ({ children, router, theme }: LayoutProviderProps) => {
  const [headerPortalRef, setHeaderPortalRef] = useState(null);
  const [headerData, setHeaderData] = useState<HeaderProps>({} as HeaderProps);

  const [headerContainerRef, setHeaderContainerRef] =
    useState<React.RefObject<HTMLDivElement>>(null);
  const useMenu = useMenuContext();
  const headerRootRef = useRef<Root>(null);
  const headerRef = useRef<HeaderProps>(headerData);
  const pageRef = useRef<PageProps>({
    title: null,
  });

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
        header: {
          ...headerRef.current,
          setHeader,
        },
        initialize,
        page: {
          ...pageRef.current,
          setPage,
        },
      }}
    >
      {headerPortalRef?.current &&
        createPortal(
          <Header
            {...{
              ...headerRef?.current,
              ...headerData,
            }}
            router={router}
          />,
          headerPortalRef?.current,
        )}
      {children}
    </LayoutContext.Provider>
  );
};
