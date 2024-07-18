import Header from '@components/v2/Layout/Header';
import { HeaderProps } from '@components/v2/Layout/Header/interfaces';
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
    title: 'Mage Pro',
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

    // const element = document.getElementById(HEADER_ROOT_ID);
    // if (!element) return;
    // headerRootRef.current ||= createRoot(element);
    // headerRootRef.current.render(
    //   <ContextProvider router={router} theme={theme}>
    //     <Header {...headerRef.current} router={router} />
    //   </ContextProvider  >
    // );

    // console.log(kwargs, headerContainerRef.current,
    //   headerContainerRef?.current?.querySelectorAll('[role="title"]')
    // )

    // const title = headerContainerRef?.current?.querySelector('[role="title"]') as HTMLElement;
    // if (title) {
    //   title.innerText = headerRef.current.title;
    // }
    // const tag = headerContainerRef?.current?.querySelector('[role="tag"]') as HTMLElement;
    // if (tag) {
    //   tag.innerText = headerRef.current.navTag;
    // }
    // const buttons = headerContainerRef?.current?.querySelectorAll('[role="button"]');
    // buttons?.forEach((button: HTMLDivElement) => {
    //   button?.getAttribute?.('data-uuid') === headerRef.current.selectedNavItem
    //     ? button.classList.add(stylesHeader.selected)
    //     : button.classList.remove(stylesHeader.selected);
    // });
  }

  function setPage(
    page: PageProps & {
      busy?: boolean;
      error?: boolean;
      notice?: boolean;
      success?: boolean;
    },
  ) {
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
      changeFavicon(`/favicon-${status}.png`);
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
