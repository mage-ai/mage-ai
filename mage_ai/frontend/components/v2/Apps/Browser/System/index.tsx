import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';

import DeferredRenderer from '@mana/components/DeferredRenderer';
import Menu from '@mana/components/Menu';
import Item from './Item/index';
import icons from '@mana/icons';
import mocks from './mocks';
import { AppConfigType } from '../../interfaces';
import { GroupByStrategyEnum } from './enums';
import {
  KEY_CODE_A,
  KEY_CODE_ENTER,
  KEY_SYMBOL_ESCAPE,
  KEY_CODE_META,
  KEY_CODE_CONTROL,
} from '@utils/hooks/keyboardShortcuts/constants';
import { ItemDetailType } from './interfaces';
import { selectKeys } from '@utils/hash';
// @ts-ignore
import Worker from 'worker-loader!@public/workers/worker.ts';

const { Settings } = icons;

type SystemBrowserProps = {
  app: AppConfigType;
};

function SystemBrowser({ app }: SystemBrowserProps) {
  const themeContext = useContext(ThemeContext);
  const containerRef = useRef(null);

  const filePathsRef = useRef<string[]>(mocks.projectFilePaths);
  const itemsRootRef = useRef(null);
  const contextMenuRootRef = useRef(null);

  const appUUID = useMemo(() => app?.uuid, [app]);
  const contextMenuRootID = useMemo(() => `system-browser-context-menu-root-${appUUID}`, [appUUID]);
  const rootID = useMemo(() => `system-browser-items-root-${appUUID}`, [appUUID]);

  const renderContextMenu = useCallback(
    (item: ItemDetailType, event: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef?.current || !containerRef?.current?.contains(event.target as Node)) {
        return;
      }

      event.preventDefault();

      if (!contextMenuRootRef?.current) {
        const node = document.getElementById(contextMenuRootID);
        contextMenuRootRef.current = createRoot(node as HTMLElement);
      }

      if (contextMenuRootRef?.current) {
        const items = [
          { uuid: 'New file', Icon: Settings },
          { uuid: 'New folder' },
          { divider: true },
          {
            uuid: 'Open file',
            Icon: Settings,
            keyboardShortcuts: [[KEY_CODE_META, KEY_CODE_ENTER]],
          },
          { uuid: 'Duplicate', description: () => 'Carbon copy file' },
          { uuid: 'Move' },
          { divider: true },
          { uuid: 'Rename' },
          {
            uuid: 'Delete',
            keyboardShortcuts: [
              [KEY_CODE_META, KEY_CODE_A],
              [KEY_CODE_CONTROL, KEY_SYMBOL_ESCAPE],
            ],
          },
          { divider: true },
          {
            uuid: 'Transfer',
            items: [{ uuid: 'Upload files' }, { uuid: 'Download file' }],
          },
          {
            uuid: 'Copy',
            items: [{ uuid: 'Copy path' }, { uuid: 'Copy relative path' }],
          },
          { divider: true },
          {
            uuid: 'View',
            items: [{ uuid: 'Expand subdirectories' }, { uuid: 'Collapse subdirectories' }],
          },
          { divider: true },
          {
            uuid: 'Projects',
            items: [{ uuid: 'New Mage project' }, { uuid: 'New dbt project' }],
          },
        ];

        contextMenuRootRef.current.render(
          <React.StrictMode>
            <DeferredRenderer idleTimeout={1}>
              <ThemeProvider theme={themeContext}>
                <Menu
                  boundingContainer={selectKeys(
                    containerRef?.current?.getBoundingClientRect() || {},
                    ['width', 'x', 'y'],
                  )}
                  coordinates={{ x: event.pageX, y: event.pageY }}
                  items={items}
                  small
                  uuid={appUUID}
                />
              </ThemeProvider>
            </DeferredRenderer>
          </React.StrictMode>,
        );
      }
    },
    [appUUID, contextMenuRootID, themeContext],
  );

  function removeContextMenu() {
    if (contextMenuRootRef?.current) {
      contextMenuRootRef.current.unmount();
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
                      onContextMenu={(event: React.MouseEvent<HTMLDivElement>) =>
                        renderContextMenu(item, event)
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
