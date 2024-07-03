import React, { useContext } from 'react';
import { HeaderProps } from '@components/v2/Layout/Header';

type HeaderType = {
  setHeader?: (header: HeaderProps) => void;
} & HeaderProps;

export type PageProps = {
  busy?: boolean;
  error?: boolean;
  notice?: string;
  success?: boolean;
  title?: string;
};

type PageType = {
  setPage?: (page: PageProps) => void;
} & PageProps;

export interface LayoutContextType {
  header?: HeaderType;
  page?: PageType;
}

export const LayoutContext = React.createContext<LayoutContextType>({
  header: {},
  page: {},
});

export const useLayout = () => useContext(LayoutContext);
