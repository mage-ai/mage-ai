import useWebSocket from 'react-use-websocket';
import { GridThemeProvider } from 'styled-bootstrap-grid';
import { ThemeContext } from 'styled-components';
import { ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';
import { useCallback, useContext, useMemo, useRef } from 'react';

import AuthToken from '@api/utils/AuthToken';
import KernelOutputType from '@interfaces/KernelOutputType';
import KeyboardContext from '@context/Keyboard';
import Output from './Output';
import Shell from './Shell';
import { ErrorProvider } from '@context/Error';
import { ModalProvider } from '@context/Modal';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { READY_STATE_MAPPING, WebSocketStateEnum } from '@interfaces/WebSocketType';
import { getUser } from '@utils/session';
import { getWebSocket } from '@api/utils/url';
import { parseRawDataFromMessage } from '@utils/models/kernel/utils';

export default function useInteractiveCodeOutput({
  code,
  onMessage,
  onOpen,
  shouldConnect = false,
  shouldReconnect,
  uuid,
}: {
  code?: string;
  onMessage?: (message: KernelOutputType) => void;
  onOpen?: (value: boolean) => void;
  shouldConnect?: boolean;
  shouldReconnect?: (event: any) => boolean;
  uuid: string;
}): {
  connectionState: WebSocketStateEnum;
  output: JSX.Element;
  sendMessage: (payload: {
    [key: string]: any;
  }) => void;
  shell: JSX.Element;
} {
  const keyboardContext = useContext(KeyboardContext);
  const themeContext = useContext(ThemeContext);

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
    readyState,
    sendMessage: sendMessageInit,
  } = useWebSocket(getWebSocket(`${uuid}-${user?.id}`), {
    shouldReconnect: (data) => {
      if (shouldReconnect) {
        shouldReconnect?.(data)
      }
    },
    onOpen: () => onOpen(true),
    onMessage: (message: KernelOutputType) => {
      messagesRef.current.push(message);

      if (!outputRootRef?.current) {
        const domNode = document.getElementById(outputRootUUID.current);
        if (domNode) {
          outputRootRef.current = createRoot(domNode);
        }
      }

      if (outputRootRef?.current) {
        const outputsGrouped = [];

        let parentID = null;
        let outputsByParentID = [];

        messagesRef?.current?.forEach((message: KernelOutputType) => {
          const output = parseRawDataFromMessage(String(message?.data)) || {
            data: null,
            data_type: null,
            execution_metadata: null,
            msg_id: null,
            msg_type: null,
            parent_message: null,
            uuid: null,
          };

          const {
            data,
            data_type: dataType,
            execution_metadata: executionMetadata,
            // The code that was executed; e.g. 1 + 1
            message: messageOutput,
            msg_id: msgID,
            // status, execute_input, execute_result
            msg_type: msgType,
            parent_message: parentMessage,
            uuid: msgUUID,
          } = output;
          const {
            date,
            session,
          } = executionMetadata || {
            date: null,
            session: null,
          };

          const uuidUse = parentMessage?.msg_id || msgUUID;

          if (parentID === null && uuidUse) {
            parentID = uuidUse;
          }

          if (parentID) {
            if (parentID === uuidUse) {
              outputsByParentID.push(output);
            } else {
              outputsGrouped.push(
                <Output
                  key={parentID}
                  outputs={outputsByParentID}
                />
              );
              // console.log('outputsByParentID', outputsByParentID)
              outputsByParentID = [output];
              parentID = uuidUse;
            }
          }
        });

        if (outputsByParentID?.length >= 1) {
          outputsGrouped.push(
            <Output
              key={parentID}
              outputs={outputsByParentID}
            />
          );
        }

        outputRootRef?.current?.render(
          <KeyboardContext.Provider value={keyboardContext}>
            <ThemeProvider theme={themeContext}>
              <ModalProvider>
                <ErrorProvider>
                  {outputsGrouped}
                </ErrorProvider>
              </ModalProvider>
            </ThemeProvider>
          </KeyboardContext.Provider>,
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
    connectionState: READY_STATE_MAPPING[readyState],
    output: outputRoot,
    sendMessage,
    shell,
  };
}
