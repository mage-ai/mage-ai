import React, { createContext } from 'react';
import { LayoutManagerType } from '../interfaces';

interface LayoutContextType {
  layoutConfigs: LayoutManagerType['layoutConfigs'];
}
export const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

interface LayoutProvider extends LayoutContextType {
  children: React.ReactNode;
}

export const LayoutProvider: React.FC<LayoutProvider> = ({
  children,
  ...props
}: LayoutProvider) => (
  <LayoutContext.Provider value={props}>
    {children}
  </LayoutContext.Provider>
);
