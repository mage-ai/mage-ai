import { MenuContext } from './MenuContext';
import useContextMenu, { ContextMenuProps } from '@mana/hooks/useContextMenu';

interface MenuProviderProps {
  children: React.ReactNode;
}

export const MenuProvider = ({ children }: MenuProviderProps) => {
  const useMenu = (kwargs: ContextMenuProps) => useContextMenu(kwargs);

  return (
    <MenuContext.Provider value={{ useMenu }}>
      {children}
    </MenuContext.Provider>
  );
};
