import ContextProvider from '../ContextProvider';
import Header, { HeaderProps, HEADER_ROOT_ID } from '@components/v2/Layout/Header';
import React, { useRef } from 'react';
import { FaviconStatusEnum, changeFavicon } from './favicon';
import { LayoutContext, PageProps } from './LayoutContext';
import { Root, createRoot } from 'react-dom/client';
import ThemeType from '@mana/themes/interfaces';
import { useMenuContext } from '../Menu';

interface LayoutProviderProps {
  children: React.ReactNode;
  router?: any;
  theme?: ThemeType;
}

export const LayoutProvider = ({ children, router, theme }: LayoutProviderProps) => {
  const useMenu = useMenuContext();
  const headerRootRef = useRef<Root>(null);
  const headerRef = useRef<HeaderProps>({
    navTag: undefined,
    selectedNavItem: undefined,
    title: undefined,
  });
  const pageRef = useRef<PageProps>({
    title: 'Mage Pro',
  });

  function setHeader(kwargs: HeaderProps) {
    headerRef.current = {
      ...headerRef.current,
      ...kwargs,
    };

    const element = document.getElementById(HEADER_ROOT_ID);
    if (!element) return;
    headerRootRef.current ||= createRoot(element);
    headerRootRef.current.render(
      <ContextProvider router={router} theme={theme}>
        <Header {...headerRef.current} router={router} useMenu={useMenu} />
      </ContextProvider  >
    );

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

  function setPage(page: PageProps & {
    busy?: boolean;
    error?: boolean;
    notice?: boolean;
    success?: boolean;
  }) {
    const status = page?.busy ? FaviconStatusEnum.BUSY :
      page?.error ? FaviconStatusEnum.ERROR :
        page?.notice ? FaviconStatusEnum.NOTICE :
          page?.success ? FaviconStatusEnum.SUCCESS : undefined;

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
        page: {
          ...pageRef.current,
          setPage,
        },
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};
