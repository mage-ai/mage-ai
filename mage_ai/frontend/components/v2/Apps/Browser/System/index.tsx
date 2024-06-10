import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';

import { UNIT } from '@mana/themes/spaces';
import DeferredRenderer from '@mana/components/DeferredRenderer';
import Text from '@mana/elements/Text';
import Item from './Item/index';
import filePaths from './mock';
import { HEADER_Z_INDEX } from '@components/constants';
import { AppConfigType } from '../../interfaces';
import { GroupByStrategyEnum } from './enums';
import { ItemDetailType } from './interfaces';
// @ts-ignore
import Worker from 'worker-loader!@public/workers/worker.ts';

const MENU_WIDTH: number = UNIT * 20;
const MENU_ITEM_HEIGHT = 36;

type SystemBrowserProps = {
  app: AppConfigType;
};

function SystemBrowser({ app }: SystemBrowserProps) {
  const themeContext = useContext(ThemeContext);
  const containerRef = useRef(null);

  const filePathsRef = useRef<string[]>(filePaths);
  const itemsRootRef = useRef(null);
  const contextMenuRootRef = useRef(null);

  const contextMenuRootID = useMemo(() => `system-browser-context-menu-root-${app?.uuid}`, [app]);
  const rootID = useMemo(() => `system-browser-items-root-${app?.uuid}`, [app]);

  function renderContextMenu(item: ItemDetailType, event: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef?.current
      || !containerRef?.current?.contains(event.target as Node)
    ) {
      return;
    }

    event.preventDefault();

    const {
      x: xContainer,
      width,
    } = containerRef?.current?.getBoundingClientRect() || {};
    const {
      pageX: x,
      pageY: y,
    } = event;
    let xFinal = x + UNIT;
    if (x + MENU_WIDTH >= xContainer + width) {
      xFinal = (xContainer + width) - (MENU_WIDTH + UNIT);
    }
    if (xFinal < 0) {
      xFinal = 0;
    }

    const items = [];

    let yFinal = y + (UNIT / 2);
    const menuHeight = MENU_ITEM_HEIGHT * items.length;
    if (y + menuHeight >= window.innerHeight) {
      yFinal = y - menuHeight;
    }

    if (!contextMenuRootRef?.current) {
      const node = document.getElementById(contextMenuRootID);
      contextMenuRootRef.current = createRoot(node as HTMLElement);
    }

    if (contextMenuRootRef?.current) {
      console.log('Context Menu', item);

      contextMenuRootRef.current.render(
        <React.StrictMode>
          <DeferredRenderer idleTimeout={1}>
            <ThemeProvider theme={themeContext}>
              <div
                style={{
                  left: xFinal,
                  position: 'fixed',
                  top: yFinal,
                  zIndex: HEADER_Z_INDEX + 100,
                }}
              >
                <Text>Context Menu</Text>
              </div>
            </ThemeProvider>
          </DeferredRenderer>
        </React.StrictMode>,
      );
    }
  }

  function removeContextMenu() {
    if (contextMenuRootRef?.current) {
      contextMenuRootRef.current.unmount();
      const node = document.getElementById(contextMenuRootID);
      node.remove();
      contextMenuRootRef.current = null;
    }
  }

  useEffect(() => {
    const handleDocumentClick = (event: Event) => {
      const node = document.getElementById(contextMenuRootID);
      if (node && !node?.contains(event.target as Node)) {
        removeContextMenu();
      }
    };

    document?.addEventListener('click', handleDocumentClick);

    return () => {
      document?.removeEventListener('click', handleDocumentClick);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const createWorker = async () => {
      const worker = new Worker();

      worker.onmessage = (event: MessageEvent) => {
        if (!itemsRootRef?.current) {
          const node = document.getElementById(rootID);
          itemsRootRef.current = createRoot(node as HTMLElement);
        }

        if (itemsRootRef?.current) {
          itemsRootRef.current.render(
            <React.StrictMode>
              <DeferredRenderer idleTimeout={1}>
                <ThemeProvider theme={themeContext}>
                  {Object.values(event?.data || {}).map((item: ItemDetailType, idx: number) => (
                    <Item
                      app={app}
                      item={item as ItemDetailType}
                      key={`${item.name}-${idx}`}
                      onContextMenu={
                        (event: React.MouseEvent<HTMLDivElement>) => renderContextMenu(item, event)
                      }
                      themeContext={themeContext}
                    />
                  ))}
                </ThemeProvider>
              </DeferredRenderer>
            </React.StrictMode>,
          );
        }
      };

      worker.postMessage({
        filePaths: filePathsRef.current,
        groupByStrategy: GroupByStrategyEnum.DIRECTORY,
      });

      return () => worker.terminate();
    };

    if (!itemsRootRef?.current) {
      createWorker();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootID]);

  return (
    <div ref={containerRef}>
      <div id={rootID} />
      <div id={contextMenuRootID} />
    </div>
  );
}

export default SystemBrowser;
