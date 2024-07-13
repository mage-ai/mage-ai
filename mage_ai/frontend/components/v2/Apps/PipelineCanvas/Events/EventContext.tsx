import React, { createContext } from 'react';
import { ClientEventType } from '@mana/shared/interfaces';
import { MenuItemType } from '@mana/components/Menu/interfaces';
import { RenderContextMenuOptions, RemoveContextMenuType } from '@mana/hooks/useContextMenu';

interface EventContextType {
  handleContextMenu?: (
    event: ClientEventType, items?: MenuItemType[], opts?: RenderContextMenuOptions,
  ) => void;
  handleMouseDown: (event: MouseEvent) => void;
  removeContextMenu: RemoveContextMenuType;
}

export const EventContext = createContext<EventContextType | undefined>(undefined);

interface EventProvider extends EventContextType {
  children: React.ReactNode;
}

export const EventProvider: React.FC<EventProvider> = ({
  children,
  ...props
}: EventProvider) => (
  <EventContext.Provider value={props}>
    {children}
  </EventContext.Provider>
);
