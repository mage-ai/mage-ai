import React, { createContext } from 'react';
import { SettingsManagerType } from '../interfaces';
import { MenuGroupType } from '@mana/components/Menu/interfaces';
import { LayoutConfigType } from '@components/v2/Canvas/interfaces';

interface SettingsContextType {
  activeLevel?: SettingsManagerType['activeLevel'];
  layoutConfigs: SettingsManagerType['layoutConfigs'];
  selectedGroupsRef: SettingsManagerType['selectedGroupsRef'];
}
export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProvider extends SettingsContextType {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProvider> = ({
  children,
  ...props
}: SettingsProvider) => (
  <SettingsContext.Provider
    value={props}
  >
    {children}
  </SettingsContext.Provider>
);
