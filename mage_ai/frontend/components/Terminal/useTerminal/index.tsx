import useWebSocket from 'react-use-websocket';
import { useCallback, useEffect, useMemo, useState } from 'react';

import AuthToken from '@api/utils/AuthToken';
import Divider from '@oracle/elements/Divider';
import FileEditorHeader from '@components/FileEditor/Header';
import FileTabsScroller from '@components/FileTabsScroller';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Terminal from '@components/Terminal';
import useContextMenu from '@utils/useContextMenu';
import useGetUser from '@utils/hooks/useGetUser';
import { CachedItemType } from './constants';
import { ApplicationExpansionUUIDEnum, CommandCenterStateEnum } from '@interfaces/CommandCenterType';
import { CUSTOM_EVENT_NAME_APPLICATION_STATE_CHANGED } from '@utils/events/constants';
import { CUSTOM_EVENT_NAME_COMMAND_CENTER_STATE_CHANGED } from '@utils/events/constants';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { StatusEnum } from '@storage/ApplicationManager/constants';
import { Terminal as TerminalIcon } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { cleanName, randomNameGenerator } from '@utils/string';
import { getItems, setItems } from './storage';
import { getWebSocket } from '@api/utils/url';
import { pushAtIndex } from '@utils/array';
import { useFileTabs } from '@components/PipelineDetail/FileTabs';

const UUID_MAIN = 'Main Mage';
const DEFAULT_ITEM = { selected: true, uuid: UUID_MAIN };

export const ICON_SIZE = UNIT * 2;
export const MENU_ICON_SIZE = UNIT * 1.5;
const MENU_ICON_PROPS = {
  default: true,
  size: MENU_ICON_SIZE,
};

export default function useTerminal({
  uuid: uuidTerminalController,
}: {
  uuid: string;
}): {
  menu: JSX.Element;
  menuTabsCombined: JSX.Element;
  tabs: JSX.Element;
  terminal: JSX.Element;
} {
  const user = useGetUser() || { id: '__NO_ID__' };
  const token = useMemo(() => new AuthToken(), []);
  const oauthWebsocketData = useMemo(() => ({
    api_key: OAUTH2_APPLICATION_CLIENT_ID,
    token: token.decodedToken.token,
  }), [
    token,
  ]);

  const [items, setItemsState] = useState<CachedItemType[]>([]);
  const selectedItem: CachedItemType =
    useMemo(() => items?.find(item => item?.selected) || items?.[0], [items]);

  const [focus, setFocusState] = useState<{
    [uuid: string]: boolean;
  }>({});

  const setFocus = useCallback(({ uuid }: CachedItemType, prev0) => {
    setFocusState((prev1) => {
      const value = typeof prev0 === 'function' ? prev0(prev1?.[uuid]) : prev0;

      return {
        ...prev1,
        [uuid]: value,
      };
    });
  }, []);

  const updateItems = useCallback((items: CachedItemType[], replace: boolean = false) => {
    const arr = replace ? items : (getItems() || [])?.map((item) => {
      let i = items?.find(({ uuid }) => uuid === item?.uuid);
      if (i) {
        i = {
          ...item,
          ...i,
        };
      }
      return i;
    });
    setItems(arr);
    setItemsState(arr);
  }, []);

  const addItem = useCallback((item: CachedItemType, idx: number = 0) => {
    if (!item) {
      return;
    }

    const values = pushAtIndex(item, idx || 0, items?.map(i => ({ ...i, selected: false })));
    setItems(values, true);
    setItemsState(() => values);
  }, [items]);

  const removeItem = useCallback((uuidSelected: string) => {
    if (UUID_MAIN === uuidSelected) {
      return;
    }

    const index = items?.findIndex(({ uuid }) => uuid === uuidSelected);
    const values = items?.filter(({ uuid }) => uuid !== uuidSelected);

    if (values?.length === 0) {
      values.push(DEFAULT_ITEM);
    } else {
      values[values?.length > index ? values?.length - 1 : index].selected = true;
    }

    setItems(values, true);
    setItemsState(() => values);
  }, [items]);

  // Run this only once on mount.
  useEffect(() => {
    if (!items?.length && !selectedItem) {
      const arr = getItems();
      if (arr?.length >= 1) {
        setItemsState(arr);
      } else {
        addItem(DEFAULT_ITEM);
      }
    }
  }, []);

  useEffect(() => {
    const handleState = ({
      detail,
    }) => {
      if (selectedItem) {
        if (detail?.state) {
          // Need this or else it’ll set it back to false.
          setTimeout(() =>
            setFocus(selectedItem, () => CommandCenterStateEnum.OPEN !== detail?.state),
            1,
          );
        } else if (detail?.item?.uuid === ApplicationExpansionUUIDEnum.PortalTerminal) {
          setTimeout(() =>
            setFocus(selectedItem, () => StatusEnum.OPEN === detail?.item?.state?.status),
            1,
          );
        }
      }
    };

    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.addEventListener(CUSTOM_EVENT_NAME_APPLICATION_STATE_CHANGED, handleState);
      // @ts-ignore
      window.addEventListener(CUSTOM_EVENT_NAME_COMMAND_CENTER_STATE_CHANGED, handleState);
    }

    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.removeEventListener(CUSTOM_EVENT_NAME_APPLICATION_STATE_CHANGED, handleState);
        // @ts-ignore
        window.removeEventListener(CUSTOM_EVENT_NAME_COMMAND_CENTER_STATE_CHANGED, handleState);
      }
    };
  }, [selectedItem]);

  const {
    lastMessage,
    sendMessage,
  } = useWebSocket(getWebSocket(selectedItem ? 'terminal' : null), {
    queryParams: {
      term_name: `${user?.id}--${uuidTerminalController}--${selectedItem?.uuid}`,
    },
  }, !!selectedItem);

  const setSelectedItemUUID = useCallback((uuidSelected: string) => {
    updateItems(items?.map(item => ({ ...item, selected: item?.uuid === uuidSelected })));
  }, [items, selectedItem]);

  const terminal = useMemo(() => {
    if (!items?.length) {
      return null;
    }

    return (
      <Terminal
        key={selectedItem?.uuid}
        focus={focus?.[selectedItem?.uuid] || false}
        lastMessage={lastMessage}
        oauthWebsocketData={oauthWebsocketData}
        sendMessage={sendMessage}
        setFocus={prev => setFocus(selectedItem, prev)}
        uuid={uuidTerminalController}
      />
    );
  }, [
    focus,
    items,
    lastMessage,
    oauthWebsocketData,
    selectedItem,
    sendMessage,
    setFocus,
    uuidTerminalController,
  ]);

  const headerMenuGroups = useMemo(() => {
    return [
      {
        uuid: 'Terminal',
        items: [
          {
            beforeIcon: <TerminalIcon {...MENU_ICON_PROPS} />,
            uuid: 'Add new tab',
            onClick: (opts) => {
              addItem({
                selected: true,
                uuid: cleanName(randomNameGenerator()),
              });
            },
          },
        ],
      },
    ];
  }, [
    addItem,
  ]);

  const menuMemo = useMemo(() => (
    <FlexContainer alignItems="center" justifyContent="space-between">
      <Flex flex={1}>
        <FileEditorHeader
          menuGroups={headerMenuGroups}
        />
      </Flex>
      <Spacing mr={1} />
    </FlexContainer>
  ), [
    headerMenuGroups,
  ]);

  const {
    contextMenu,
    hideContextMenu,
    showContextMenu,
  } = useContextMenu(`${uuidTerminalController}/tabs`);

  const onContextMenu = useCallback((event: MouseEvent, uuid: string) => {
    const menuItems = [
      {
        uuid: 'Close all tabs',
        onClick: () => {
          updateItems([DEFAULT_ITEM], true);
          hideContextMenu();
        },
      },
    ];

    if (DEFAULT_ITEM?.uuid !== uuid) {
      menuItems.unshift({
        uuid: 'Close tab',
        onClick: () => {
          removeItem(uuid);
          hideContextMenu();
        },
      });
    }

    menuItems.unshift({
      uuid: 'Add tab',
      onClick: () => {
        addItem({
          selected: true,
          uuid: cleanName(randomNameGenerator()),
        }, items?.findIndex(item => item?.uuid === uuid));
        hideContextMenu();
      },
    });

    showContextMenu(event, {
      menuItems,
    });
  }, [
    addItem,
    hideContextMenu,
    items,
    removeItem,
    showContextMenu,
    updateItems,
  ]);

  const {
    tabs,
  } = useFileTabs({
    filePaths: items?.map(item => item?.uuid),
    isSelectedFilePath: (uuid: string, selected: string) => uuid === selected,
    onClickTab: (uuid: string) => {
      setSelectedItemUUID(uuid);
    },
    onClickTabClose: (uuid: string) => {
      removeItem(uuid);
    },
    onContextMenu,
    renderTabIcon: (uuid: string) => (
      <TerminalIcon
        {...MENU_ICON_PROPS}
        muted={uuid !== selectedItem?.uuid}
        success={uuid === selectedItem?.uuid}
      />
    ),
    renderTabTitle: (uuid: string) => {
      return uuid?.replace('_', ' ');
    },
    selectedFilePath: selectedItem?.uuid,
    shouldDisableClose: (uuid: string) => uuid === UUID_MAIN,
  });

  const tabsMemo = useMemo(() => (
    <FileTabsScroller
      // @ts-ignore
      fileTabs={tabs}
      selectedFilePathIndex={items?.findIndex(item => selectedItem?.uuid === item?.uuid)}
    >
      {contextMenu}
    </FileTabsScroller>
  ), [contextMenu, items, selectedItem, tabs]);

  const menuTabsCombined = useMemo(() => (
    <div
      style={{
        position: 'relative',
        zIndex: 3,
      }}
    >
      <Spacing py={1}>
        {menuMemo}
      </Spacing>

      <Divider light />

      {tabsMemo}
    </div>
  ), [menuMemo, tabsMemo]);

  return {
    menu: menuMemo,
    menuTabsCombined,
    tabs: tabsMemo,
    terminal,
  };
}
