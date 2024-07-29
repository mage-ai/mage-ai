import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Item from './Item/index';
import Loading from '@mana/components/Loading';
import Scrollbar from '@mana/elements/Scrollbar';
import { useMutate } from '@context/v2/APIMutation/useMutate';
import { ALL_SUPPORTED_FILE_EXTENSIONS_REGEX, COMMON_EXCLUDE_PATTERNS } from '@interfaces/FileType';
import {
  AppConfigType,
  AppLoaderProps,
  AddPanelOperationType,
  OperationTypeEnum,
} from '../../interfaces';
import { AppSubtypeEnum, AppTypeEnum } from '../../constants';
import { RemoveContextMenuType, RenderContextMenuType } from '@mana/hooks/useContextMenu';
import { DragSettingsType, ItemDetailType } from './interfaces';
import { ItemTypeEnum } from './enums';
import { Settings } from '@mana/icons';
import { groupFilesByDirectory } from './utils/grouping';
import { mergeDeep } from '@utils/hash';
import {
  KEY_CODE_A,
  KEY_CODE_ENTER,
  KEY_SYMBOL_ESCAPE,
  KEY_CODE_META,
  KEY_CODE_CONTROL,
} from '@utils/hooks/keyboardShortcuts/constants';
import { FileType } from '@components/v2/IDE/interfaces';
import ContextProvider from '@context/v2/ContextProvider';
import { getTheme } from '@mana/themes/utils';
// @ts-ignore
// import Worker from 'worker-loader!@public/workers/worker.ts';

type SystemBrowserProps = {
  itemDragSettings?: DragSettingsType;
  removeContextMenu: RemoveContextMenuType;
  renderContextMenu: RenderContextMenuType;
};

function SystemBrowser({
  app,
  itemDragSettings,
  operations,
  removeContextMenu,
  renderContextMenu,
}: SystemBrowserProps & AppLoaderProps, ref: React.Ref<HTMLDivElement>) {
  const containerRef = useRef(null);
  const theme = getTheme();

  const filePathsRef = useRef<FileType[]>(null);
  const itemsRootRef = useRef(null);

  const appUUID = useMemo(() => app?.uuid, [app]);
  const rootID = useMemo(() => `system-browser-items-root-${appUUID}`, [appUUID]);

  const addPanel = app?.operations?.[OperationTypeEnum.ADD_PANEL]?.effect as AddPanelOperationType;
  const removeApp = operations?.[OperationTypeEnum.REMOVE_APP]?.effect;

  function renderItems(items: ItemDetailType[]) {
    if (!itemsRootRef?.current) {
      const node = document.getElementById(rootID);
      try {
        itemsRootRef.current = createRoot(node as HTMLElement);
      } catch (error) {
        console.error(error);
      }
    }

    if (itemsRootRef?.current) {
      const groups = groupFilesByDirectory(items as ItemDetailType[]);
      itemsRootRef.current.render(

        <ContextProvider>
          {Object.values(groups || {}).map((item: ItemDetailType, idx: number) => (
            <Item
              app={app}
              dragSettings={itemDragSettings}
              item={item as ItemDetailType}
              key={`${item.name}-${idx}`}
              onClick={(event: any, itemClicked) => {
                event.preventDefault();
                event.stopPropagation();

                removeContextMenu(event);

                if (ItemTypeEnum.FILE === itemClicked?.type) {
                  // import('../../../IDE/Manager').then((mod: any) => {
                  //   const Manager = mod.Manager;

                  //   if (!Manager?.isResourceOpen?.(itemClicked?.path)) {
                  //     addPanel({
                  //       apps: [
                  //         (appProps?: AppConfigType) =>
                  //           mergeDeep(
                  //             {
                  //               operations: {
                  //                 [OperationTypeEnum.REMOVE_APP]: { effect: removeApp },
                  //               },
                  //               options: {
                  //                 file: itemClicked,
                  //               },
                  //               subtype: AppSubtypeEnum.IDE,
                  //               type: AppTypeEnum.EDITOR,
                  //               uuid: itemClicked?.name,
                  //             },
                  //             appProps,
                  //           ),
                  //       ],
                  //       uuid: `panel-${itemClicked?.name}`,
                  //     });
                  //   }
                  // });

                  addPanel({
                    apps: [
                      (appProps?: AppConfigType) =>
                        mergeDeep(
                          {
                            operations: {
                              [OperationTypeEnum.REMOVE_APP]: { effect: removeApp },
                            },
                            options: {
                              file: itemClicked,
                            },
                            subtype: AppSubtypeEnum.IDE,
                            type: AppTypeEnum.EDITOR,
                            uuid: itemClicked?.name,
                          },
                          appProps,
                        ),
                    ],
                    uuid: `panel-${itemClicked?.name}`,
                  });
                }
              }}
              onContextMenu={(event: any) => {
                const menuItems = [
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
                    items: [
                      { uuid: 'Expand subdirectories' },
                      { uuid: 'Collapse subdirectories' },
                    ],
                  },
                  { divider: true },
                  {
                    uuid: 'Projects',
                    items: [{ uuid: 'New Mage project' }, { uuid: 'New dbt project' }],
                  },
                ];

                renderContextMenu(event, menuItems, {
                  handleEscape: (event2: any) => {
                    removeContextMenu(event2 as any);
                  },
                  rects: {
                    bounding: containerRef.current.getBoundingClientRect(),
                  },
                });
              }}
              themeContext={theme}
            />
          ))}
        </ContextProvider>
      );
    }
  }

  const mutants = useMutate({
    resource: 'browser_items',
  }, {
    handlers: {
      list: {
        onSuccess: (items: FileType[]) => {
          if (items?.length >= 1) {
            filePathsRef.current = items;
            renderItems((items || []) as ItemDetailType[]);
          }
        },
      },
    },
  });

  useEffect(() => {
    if (!filePathsRef.current && !mutants.list.isPending) {
      mutants.list.mutate({
        query: {
          exclude_pattern: COMMON_EXCLUDE_PATTERNS,
          include_pattern: encodeURIComponent(String(ALL_SUPPORTED_FILE_EXTENSIONS_REGEX)),
        },
      });
    }

    const itemsRoot = itemsRootRef?.current;
    return () => {
      itemsRoot && itemsRoot.unmount();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Scrollbar ref={containerRef} style={{ overflow: 'auto' }}>
      {mutants.list.isPending && <Loading />}

      <div id={rootID} />
    </Scrollbar>
  );
}

export default React.forwardRef(SystemBrowser);
