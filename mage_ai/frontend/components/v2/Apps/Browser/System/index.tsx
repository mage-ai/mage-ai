import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';

import api from '@api';
import Loading from '@mana/components/Loading';
import Scrollbar from '@mana/elements/Scrollbar';
import DeferredRenderer from '@mana/components/DeferredRenderer';
import { onSuccess } from '@api/utils/response';
import { ALL_SUPPORTED_FILE_EXTENSIONS_REGEX, COMMON_EXCLUDE_PATTERNS } from '@interfaces/FileType';
import Menu from '@mana/components/Menu';
import Item from './Item/index';
import { Settings } from '@mana/icons';
import { AppLoaderProps, AppConfigType } from '../../interfaces';
import { GroupByStrategyEnum, ItemTypeEnum } from './enums';
import {
  KEY_CODE_A,
  KEY_CODE_ENTER,
  KEY_SYMBOL_ESCAPE,
  KEY_CODE_META,
  KEY_CODE_CONTROL,
} from '@utils/hooks/keyboardShortcuts/constants';
import { ItemDetailType, ItemType } from './interfaces';
import { selectKeys } from '@utils/hash';
// @ts-ignore
import Worker from 'worker-loader!@public/workers/worker.ts';
import { useMutation } from 'react-query';
import { AppSubtypeEnum, AppTypeEnum } from '../../constants';
import { groupFilesByDirectory } from './utils/grouping';

function SystemBrowser({ addApp, app, removeApp }: AppLoaderProps) {
  const themeContext = useContext(ThemeContext);
  const containerRef = useRef(null);

  const filePathsRef = useRef<string[]>(null);
  const itemsRootRef = useRef(null);
  const contextMenuRootRef = useRef(null);

  const appUUID = useMemo(() => app?.uuid, [app]);
  const contextMenuRootID = useMemo(() => `system-browser-context-menu-root-${appUUID}`, [appUUID]);
  const rootID = useMemo(() => `system-browser-items-root-${appUUID}`, [appUUID]);

  function removeContextMenu() {
    if (contextMenuRootRef?.current) {
      contextMenuRootRef.current.unmount();
      contextMenuRootRef.current = null;
    }
  }

  function renderItems(items: ItemDetailType[]) {
    if (!itemsRootRef?.current) {
      const node = document.getElementById(rootID);
      itemsRootRef.current = createRoot(node as HTMLElement);
    }

    if (itemsRootRef?.current) {
      const groups = groupFilesByDirectory(items as ItemDetailType[]);
      itemsRootRef.current.render(
        <React.StrictMode>
          <DeferredRenderer idleTimeout={1}>
            <ThemeProvider theme={themeContext}>
              {Object.values(groups || {}).map((item: ItemDetailType, idx: number) => (
                <Item
                  app={app}
                  item={item as ItemDetailType}
                  key={`${item.name}-${idx}`}
                  onClick={(event: React.MouseEvent<HTMLDivElement>, itemClicked) => {
                    console.log('onClick', itemClicked);
                    removeContextMenu();
                    if (ItemTypeEnum.FILE === itemClicked?.type) {
                      addApp(
                        {
                          options: {
                            file: {
                              content: itemClicked?.content,
                              uri: itemClicked?.path,
                            },
                          },
                          subtype: AppSubtypeEnum.IDE,
                          type: AppTypeEnum.EDITOR,
                          uuid: itemClicked?.name,
                        },
                        {
                          grid: {
                            relative: {
                              layout: {
                                column: 1,
                              },
                              uuid: app?.uuid,
                            },
                          },
                        },
                      );
                    }
                  }}
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
  }

  const [fetchItems, { isLoading }] = useMutation(
    (query?: {
      _limit?: number;
      _offset?: number;
      directory?: string;
      exclude_pattern?: string | RegExp;
      include_pattern?: string | RegExp;
    }) => api.browser_items.listAsync(query),
    {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: ({ browser_items: items }) => {
            if (items?.length >= 1) {
              filePathsRef.current = items;
              renderItems((items || []) as ItemDetailType[]);
            }
          },
          onErrorCallback: (response, errors) =>
            console.error({
              errors,
              response,
            }),
        }),
    },
  );

  const renderContextMenu = useCallback(
    (item: ItemDetailType, event: React.MouseEvent<HTMLDivElement>) => {
      if (!containerRef?.current || !containerRef?.current?.contains(event.target as Node)) {
        return;
      }

      event.preventDefault();

      if (!contextMenuRootRef?.current) {
        const node = document.getElementById(contextMenuRootID);
        if (node) {
          contextMenuRootRef.current = createRoot(node as HTMLElement);
        }
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
                  event={event}
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

  useEffect(() => {
    if (!itemsRootRef?.current) {
      fetchItems({
        exclude_pattern: COMMON_EXCLUDE_PATTERNS,
        include_pattern: encodeURIComponent(String(ALL_SUPPORTED_FILE_EXTENSIONS_REGEX)),
      });
    }

    const handleDocumentClick = (event: Event) => {
      const node = document.getElementById(contextMenuRootID);
      if (node && !node?.contains(event.target as Node)) {
        removeContextMenu();
      }
    };

    document?.addEventListener('click', handleDocumentClick);

    const itemsRoot = itemsRootRef?.current;
    return () => {
      document?.removeEventListener('click', handleDocumentClick);
      removeContextMenu();

      if (itemsRoot) {
        itemsRootRef.current.unmount();
        itemsRootRef.current = null;
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Scrollbar ref={containerRef} style={{ overflow: 'auto' }}>
      {isLoading && <Loading />}
      <div id={rootID} />
      <div id={contextMenuRootID} />
    </Scrollbar>
  );
}

export default SystemBrowser;
