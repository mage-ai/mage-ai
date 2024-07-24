import React, { useContext } from 'react';
import { HeaderProps } from './Header/interfaces';
import { RouteType } from '@mana/shared/interfaces';
import { ThemeSettingsType } from '@mana/themes/interfaces';

type HeaderType = {
  setHeader?: (header: HeaderProps) => void;
} & HeaderProps;

export type PageProps = {
  busy?: boolean;
  error?: boolean;
  notice?: boolean;
  success?: boolean;
  title?: string;
};

type PageType = {
  setPage?: (page: PageProps) => void;
} & PageProps;

export interface LayoutContextType {
  changeRoute: (appRoute: RouteType, opts?: {
    appendOnly?: boolean;
    transitionOnly?: boolean;
  }) => void;
  header?: HeaderType;
  initialize?: (props: { headerRef: React.RefObject<HTMLDivElement> }) => void;
  page?: PageType;
  updateThemeSettings: HeaderProps['updateThemeSettings'];
}

export const LayoutContext = React.createContext<LayoutContextType>({
  changeRoute: () => null,
  header: {},
  initialize: null,
  page: {},
  updateThemeSettings: () => null,
});

export const useLayout = () => useContext(LayoutContext);
