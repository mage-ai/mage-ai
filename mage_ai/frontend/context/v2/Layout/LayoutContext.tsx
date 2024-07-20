import React, { useContext } from 'react';
import { HeaderProps } from './Header/interfaces';

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
  header?: HeaderType;
  initialize?: (props: { headerRef: React.RefObject<HTMLDivElement> }) => void;
  page?: PageType;
}

export const LayoutContext = React.createContext<LayoutContextType>({
  header: {},
  initialize: null,
  page: {},
});

export const useLayout = () => useContext(LayoutContext);
