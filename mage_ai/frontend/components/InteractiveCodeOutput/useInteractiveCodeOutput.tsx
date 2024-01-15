import useWebSocket from 'react-use-websocket';
import { createRoot } from 'react-dom/client';
import { useCallback, useMemo, useRef } from 'react';

import AuthToken from '@api/utils/AuthToken';
import KernelOutputType from '@interfaces/KernelOutputType';
import Output from './Output';
import Shell from './Shell';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { getUser } from '@utils/session';
import { getWebSocket } from '@api/utils/url';
import { parseRawDataFromMessage } from '@utils/models/kernel/utils';

export default function useInteractiveCodeOutput({
  code,
  onMessage,
  shouldConnect = false,
  uuid,
}: {
  code?: string;
  onMessage?: (message: KernelOutputType) => void;
  shouldConnect?: boolean;
  uuid: string;
}): {
  output: JSX.Element;
  sendMessage: (payload: {
    [key: string]: any;
  }) => void;
  shell: JSX.Element;
} {
  const user = getUser() || { id: '__NO_ID__' };
  const token = useMemo(() => new AuthToken(), []);
  const oauthWebsocketData = useMemo(() => ({
    api_key: OAUTH2_APPLICATION_CLIENT_ID,
    token: token.decodedToken.token,
  }), [
    token,
  ]);

  const messagesRef = useRef([]);
  const outputContainerRef = useRef(null);
  const outputContentRef = useRef(null);
  const outputItemsRef = useRef([]);
  const outputRootRef = useRef(null);
  const outputRootUUID = useRef(`${uuid}-output-root`);

  const {
    // lastMessage,
    // readyState,
    sendMessage: sendMessageInit,
  } = useWebSocket(getWebSocket(`${uuid}-${user?.id}`), {
    // shouldReconnect: (data) => {
    //   return false;
    // },
    // onOpen
    onMessage: (message: KernelOutputType) => {
      messagesRef.current.push(message);

      if (!outputRootRef?.current) {
        const domNode = document.getElementById(outputRootUUID.current);
        if (domNode) {
          outputRootRef.current = createRoot(domNode);
        }
      }

      if (outputRootRef?.current) {
        const {
          msg_id: msgID,
          uuid: msgUUID,
        } = parseRawDataFromMessage(String(message?.data)) || {};

        const output = (
          <Output
            key={msgUUID || `${msgID}-${message?.timeStamp}`}
            message={message}
          />
        );

        outputItemsRef.current.push(output);
        outputRootRef?.current?.render(
          <>
            {outputItemsRef?.current?.map(el => el)}
          </>,
        );
      }

      if (onMessage) {
        onMessage?.(message);
      }
    },
  }, shouldConnect && !!uuid);

  const sendMessage = useCallback((payload: {
    [key: string]: any;
  }) => {
    return sendMessageInit(JSON.stringify({
      ...oauthWebsocketData,
      ...payload,
    }))
  }, [oauthWebsocketData, sendMessageInit]);

  const outputRoot = useMemo(() => {
    return (
      <div ref={outputContainerRef}>
        <div
          id={outputRootUUID.current}
          ref={outputContentRef}
        />
      </div>
    );
  }, []);

  const shell = useMemo(() => {
    return (
      <Shell
        messagesRef={messagesRef}
      />
    );
  }, []);

  return {
    output: outputRoot,
    sendMessage,
    shell,
  };
}
