import { useRef } from 'react';
import { MenuContext } from './MenuContext';
import useContextMenu, { ContextMenuProps } from '@mana/hooks/useContextMenu';

export const MENU_CONTEXT_PORTAL_ID = 'menu-context-portal'

interface MenuProviderProps {
  children: React.ReactNode;
}

export const MenuProvider = ({ children }: MenuProviderProps) => {
  const portalRef = useRef<HTMLDivElement>(null);
  const useMenu = (kwargs: ContextMenuProps) => useContextMenu(kwargs);

  return (
    <MenuContext.Provider value={{
      portalID: MENU_CONTEXT_PORTAL_ID,
      portalRef,
      useMenu,
    }}>
      {children}

      <div id={MENU_CONTEXT_PORTAL_ID} ref={portalRef} />
    </MenuContext.Provider>
  );
};
