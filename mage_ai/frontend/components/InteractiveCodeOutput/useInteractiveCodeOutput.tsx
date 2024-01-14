import useWebSocket from 'react-use-websocket';
import { useCallback, useMemo } from 'react';

import Output from './Output';
import Shell from './Shell';
import { getWebSocket } from '@api/utils/url';

export default function useInteractiveCodeOutput({
  code,
  shouldConnect = false,
  uuid,
}: {
  code?: string;
  shouldConnect?: boolean;
  uuid: string;
}): {
  output: JSX.Element;
  sendMessage: (payload: {
    [key: string]: any;
  }) => void;
  shell: JSX.Element;
} {
  const {
    lastMessage,
    // readyState,
    sendMessage: sendMessageInit,
  } = useWebSocket(getWebSocket(uuid), {
    queryParams: {
      term_name: uuid,
    },
    // shouldReconnect: (data) => {
    //   return false;
    // },
    // onOpen
    // onMessage
  }, shouldConnect && !!uuid);

  const sendMessage = useCallback((payload: {
    [key: string]: any;
  }) => {
    return sendMessageInit(JSON.stringify(payload))
  }, [sendMessageInit]);

  const output = useMemo(() => {
    return (
      <Output
      />
    );
  }, []);

  const shell = useMemo(() => {
    return (
      <Shell
      />
    );
  }, []);

  return {
    output,
    sendMessage,
    shell,
  };
}
