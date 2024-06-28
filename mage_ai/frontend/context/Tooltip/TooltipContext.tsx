import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom';

interface TooltipContextProps {
  showTooltip: (content: ReactNode, position: { x: number, y: number }) => void;
  hideTooltip: () => void;
}

const TooltipContext = createContext<TooltipContextProps | null>(null);

export const useTooltip = (): TooltipContextProps => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltip must be used within a TooltipProvider');
  }
  return context;
};

interface TooltipProviderProps {
  children: ReactNode;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  const [tooltip, setTooltip] = useState<{ content: ReactNode; position: { x: number; y: number } } | null>(null);

  const showTooltip = useCallback((content: ReactNode, position: { x: number, y: number }) => {
    setTooltip({ content, position });
  }, []);

  const hideTooltip = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <TooltipContext.Provider value={{ showTooltip, hideTooltip }}>
      {children}
      {tooltip && ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: tooltip.position.y, left: tooltip.position.x, backgroundColor: 'black', color: 'white', padding: '8px 12px', borderRadius: '4px', zIndex: 1000 }}>
          {tooltip.content}
        </div>,
        document.body
      )}
    </TooltipContext.Provider>
  );
};
