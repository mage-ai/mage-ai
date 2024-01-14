import useWebSocket from 'react-use-websocket';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Terminal from '@components/Terminal';
import { getUser } from '@utils/session';
import { getWebSocket } from '@api/utils/url';
import { useFileTabs } from '@components/PipelineDetail/FileTabs';
import { getUUIDs, setUUIDs } from './storage';

export default function useTerminal({
  uuid: uuidTerminalController,
}: {
  uuid: string;
}): {
  tabs: JSX.Element;
  terminal: JSX.Element;
} {
  const user = getUser() || { id: '__NO_ID__' };

  const [itemUUIDs, setItemUUIDs] = useState<string[]>(null);
  const [selectedItemUUID, setSelectedItemUUID] = useState<string>(null);

  const [command, setCommandState] = useState<{
    [uuid: string]: string;
  }>({});
  const [commandHistory, setCommandHistoryState] = useState<{
    [uuid: string]: string[];
  }>({});
  const [commandIndex, setCommandIndexState] = useState<{
    [uuid: string]: number;
  }>({});
  const [cursorIndex, setCursorIndexState] = useState<{
    [uuid: string]: number;
  }>({});
  const [focus, setFocusState] = useState<{
    [uuid: string]: boolean;
  }>({});
  const [stdout, setStdoutState] = useState<{
    [uuid: string]: string;
  }>({});

  const setCommand = useCallback((uuid: string, prev0) => {
    setCommandState((prev1) => {
      const value = typeof prev0 === 'function' ? prev0(prev1?.[uuid] || '') : prev0;

      return {
        ...prev1,
        [uuid]: value,
      };
    });
  }, []);
  const setCommandHistory = useCallback((uuid: string, prev0) => {
    setCommandHistoryState((prev1) => {
      const value = typeof prev0 === 'function' ? prev0(prev1?.[uuid] || []) : prev0;

      return {
        ...prev1,
        [uuid]: [...(prev1?.[uuid] || []), value],
      };
    });
  }, []);
  const setCommandIndex = useCallback((uuid: string, prev0) => {
    setCommandIndexState((prev1) => {
      const value = typeof prev0 === 'function' ? prev0(prev1?.[uuid] || 0) : prev0;

      return {
        ...prev1,
        [uuid]: value,
      };
    });
  }, []);
  const setCursorIndex = useCallback((uuid: string, prev0) => {
    setCursorIndexState((prev1) => {
      const value = typeof prev0 === 'function' ? prev0(prev1?.[uuid] || 0) : prev0;

      return {
        ...prev1,
        [uuid]: value,
      };
    });
  }, []);
  const setFocus = useCallback((uuid: string, prev0) => {
    setFocusState((prev1) => {
      const value = typeof prev0 === 'function' ? prev0(prev1?.[uuid] || true) : prev0;

      return {
        ...prev1,
        [uuid]: value,
      };
    });
  }, []);
  const setStdout = useCallback((uuid: string, prev0) => {
    setStdoutState((prev1) => {
      const value = typeof prev0 === 'function' ? prev0(prev1?.[uuid]) : prev0;

      return {
        ...prev1,
        [uuid]: value,
      };
    });
  }, []);

  const addItem = useCallback((uuidSelected: string) => {
    if (!uuidSelected) {
      return;
    }

    setItemUUIDs((prev: string[]) => {
      const values = [uuidSelected].concat(prev);
      setUUIDs(values?.map(uuid => ({ selected: uuid === uuidSelected, uuid })), true);
      return values;
    });

    setSelectedItemUUID(uuidSelected);
  }, []);

  const removeItem = useCallback((uuid: string) => {
    const index = itemUUIDs?.findIndex(s => s === uuid) - 1;
    const uuidSelected = itemUUIDs?.[index];

    const values = itemUUIDs?.filter(s => s !== uuid);
    setItemUUIDs(() => values);

    setUUIDs(values?.map(uuid => ({ selected: uuid == uuidSelected, uuid })), true);
    setSelectedItemUUID(uuidSelected);
  }, [itemUUIDs]);

  // Run this only once on mount.
  useEffect(() => {
    if (!itemUUIDs?.length && !selectedItemUUID) {
      const arr = getUUIDs();
      if (arr?.length >= 1) {
        setItemUUIDs(arr?.map(({ uuid }) => uuid));
        setSelectedItemUUID(arr?.find(({ selected }) => selected)?.uuid);
      } else {
        addItem('first');
      }
    }
  }, []);

  const onContextMenu = useCallback(() => {

  }, []);

  const {
    lastMessage,
    readyState,
    sendMessage,
  } = useWebSocket(getWebSocket(selectedItemUUID ? 'terminal' : null), {
    queryParams: {
      term_name: `${user?.id}--${uuidTerminalController}--${selectedItemUUID}`,
    },
    shouldReconnect: () => !!selectedItemUUID,
    // onOpen
    // onMessage
  }, !!selectedItemUUID);

  const {
    tabs,
  } = useFileTabs({
    filePaths: itemUUIDs,
    isSelectedFilePath: (uuid: string, selected: string) => uuid === selected,
    onClickTab: (uuid: string) => {
      setSelectedItemUUID(uuid);
    },
    onClickTabClose: (uuid: string) => {
      removeItem(uuid);
    },
    onContextMenu,
    renderTabTitle: (uuid: string) => {
      return uuid;
    },
    selectedFilePath: selectedItemUUID,
  });

  const terminal = useMemo(() => {
    return (
      <Terminal
        command={command?.[selectedItemUUID] || ''}
        commandHistory={commandHistory?.[selectedItemUUID] || []}
        commandIndex={commandIndex?.[selectedItemUUID] || 0}
        cursorIndex={cursorIndex?.[selectedItemUUID] || 0}
        focus={focus?.[selectedItemUUID] || true}
        lastMessage={lastMessage}
        sendMessage={sendMessage}
        setCommand={prev => setCommand(selectedItemUUID, prev)}
        setCommandHistory={prev => setCommandHistory(selectedItemUUID, prev)}
        setCommandIndex={prev => setCommandIndex(selectedItemUUID, prev)}
        setCursorIndex={prev => setCursorIndex(selectedItemUUID, prev)}
        setFocus={prev => setFocus(selectedItemUUID, prev)}
        setStdout={prev => setStdout(selectedItemUUID, prev)}
        stdout={stdout?.[selectedItemUUID] || null}
        uuid={uuidTerminalController}
      />
    );
  }, [
    command,
    commandHistory,
    commandIndex,
    cursorIndex,
    focus,
    lastMessage,
    selectedItemUUID,
    sendMessage,
    setCommand,
    setCommandHistory,
    setCommandIndex,
    setCursorIndex,
    setFocus,
    setStdout,
    stdout,
    uuidTerminalController,
  ]);

  return {
    tabs,
    terminal,
  };
}
