import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import ClickOutside from '@oracle/components/ClickOutside';
import FlyoutMenu, { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import Panel from '@oracle/components/Panel';
import { ignoreKeys } from '@utils/hash';
import { pauseEvent } from '@utils/events';

type DataType = {
  menuItems?: FlyoutMenuItemType[];
  renderMenu?: (context: ContextType) => React.ReactNode;
};

type ContextType = {
  data: any;
  event: MouseEvent;
};

type ContextMapping = {
  [contextUUID: string]: ContextType;
};

function ContextMenu({
  children,
  x,
  y,
}: {
  children: any;
  x: number;
  y: number;
}) {
  return (
    <div
      style={{
        left: x,
        position: 'fixed',
        top: y,
        zIndex: 999,
      }}
    >
      {children}
    </div>
  );
}

export default function useContextMenu(uuid: string, container: Element = null): {
  contextMenu: React.ReactNode;
  hideContextMenu: () => void;
  showContextMenu: (event: MouseEvent, data: DataType) => void;
} {
  const [contextMapping, setContextMapping] = useState<ContextMapping>(null);
  const [mountNode, setMountNode] = useState<Element | undefined>(undefined);

  useEffect(() => {
    if (container || typeof document !== 'undefined') {
      setMountNode(container || (typeof document !== 'undefined' ? document.body : null))
    };
  }, [
    container,
  ]);

  const contextMenu = useMemo(() => {
    if (mountNode) {
      const menus = [];

      Object.entries(contextMapping || {})?.forEach(([contextUUID, context]) => {
        const {
          data: {
            menuItems,
            renderMenu,
          },
          event,
        } = context;
        const {
          clientX,
          clientY,
          target,
        } = event;

        menus.push(
          <ContextMenu
            key={contextUUID}
            x={clientX}
            y={clientY}
          >
            <ClickOutside
              disableEscape
              onClickOutside={() => setContextMapping(prev => ignoreKeys(prev, [contextUUID]))}
              open
            >
              {renderMenu && renderMenu(context)}
              {!renderMenu && menuItems?.length >= 1 && (
                <FlyoutMenu
                  items={menuItems}
                  open
                  parentRef={undefined}
                  uuid={`ContextMenu/${contextUUID}`}
                  // width={MENU_WIDTH}
                />
              )}
            </ClickOutside>
          </ContextMenu>
        );
      });

      return createPortal(
        <>
          {menus}
        </>,
        mountNode,
      );
    }
  }, [contextMapping, mountNode]);

  const showContextMenu = useCallback((event: MouseEvent, data: DataType) => {
    pauseEvent(event);
    setContextMapping(prev => ({
      ...prev,
      [uuid]: {
        event,
        data,
      },
    }));
  }, [uuid]);

  const hideContextMenu =
    useCallback(() => setContextMapping(prev => ignoreKeys(prev, [uuid])), [uuid]);

  return {
    contextMenu,
    hideContextMenu,
    showContextMenu,
  };
}
