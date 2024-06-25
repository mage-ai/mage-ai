import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  MutableRefObject,
} from 'react';
import { createPortal } from 'react-dom';

interface PortalContextProps {
  portals: Record<number, ReactNode>;
  addPortal: (level: number, element: ReactNode) => void;
  removePortalsFromLevel: (level: number) => void;
}

const PortalContext = createContext<PortalContextProps | undefined>(undefined);

interface PortalProviderProps {
  children: React.ReactNode;
  containerRef?: MutableRefObject<HTMLElement | null>;
}

export const PortalProvider: React.FC<PortalProviderProps> = ({ children, containerRef }) => {
  const [portals, setPortals] = useState<Record<number, ReactNode>>({});

  const addPortal = useCallback((level: number, element: ReactNode) => {
    setPortals(prevPortals => ({
      ...prevPortals,
      [level]: element,
    }));
  }, []);

  const removePortalsFromLevel = useCallback((level: number) => {
    setPortals(prevPortals => {
      const newPortals = Object.keys(prevPortals)
        .filter(key => parseInt(key) < level)
        .reduce(
          (acc, key) => {
            acc[parseInt(key)] = prevPortals[parseInt(key)];
            return acc;
          },
          {} as Record<number, ReactNode>,
        );
      return newPortals;
    });
  }, []);

  return (
    <PortalContext.Provider value={{ portals, addPortal, removePortalsFromLevel }}>
      {children}
      {Object.entries(portals).map(
        ([key, portal]) => containerRef?.current && createPortal(portal, containerRef.current),
      )}
    </PortalContext.Provider>
  );
};

export const usePortals = () => {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortals must be used within a PortalProvider');
  }
  return context;
};
