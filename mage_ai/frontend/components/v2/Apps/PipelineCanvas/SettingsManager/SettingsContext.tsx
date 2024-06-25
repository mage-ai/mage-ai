import React, { createContext } from 'react';
import { ZoomPanStateType } from '@mana/hooks/useZoomPan';
import { SettingsManagerType } from '../interfaces';
import { RectType } from '@mana/shared/interfaces';
import { LayoutConfigType } from '@components/v2/Canvas/interfaces';

interface SettingsContextType {
  activeLevel?: SettingsManagerType['activeLevel'];
  getSelectedGroupRectFromRefs: (rects?: Record<string, RectType>) => RectType;
  layoutConfigs?: SettingsManagerType['layoutConfigs'];
  layoutConfigsRef: React.MutableRefObject<LayoutConfigType[]>;
  selectedGroupsRef: SettingsManagerType['selectedGroupsRef'];
  transformState: React.MutableRefObject<ZoomPanStateType>;
}
export const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProvider extends SettingsContextType {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProvider> = ({
  children,
  ...props
}: SettingsProvider) => (
  <SettingsContext.Provider value={props}>{children}</SettingsContext.Provider>
);
