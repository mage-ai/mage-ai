import useWebSocket from 'react-use-websocket';
import { GridThemeProvider } from 'styled-bootstrap-grid';
import { ThemeContext } from 'styled-components';
import { ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import AuthToken from '@api/utils/AuthToken';
import KernelOutputType, { ExecutionStateEnum, ExecutionStatusEnum, MsgType } from '@interfaces/KernelOutputType';
import KeyboardContext from '@context/Keyboard';
import Output from './Output';
import Shell from './Shell';
import useKernel from '@utils/models/kernel/useKernel';
import ComponentWithCallback from '@components/shared/ComponentWithCallback';
import { ErrorProvider } from '@context/Error';
import { ModalProvider } from '@context/Modal';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { OutputContainerStyle, OutputContentStyle } from './Output/index.style';
import { READY_STATE_MAPPING, WebSocketStateEnum } from '@interfaces/WebSocketType';
import { dedupe } from '@utils/array';
import { getUser } from '@utils/session';
import { getWebSocket } from '@api/utils/url';
import { parseRawDataFromMessage } from '@utils/models/kernel/utils';
import { getLatestOutputGroup, getExecutionStatusAndState } from './Output/utils';
import KernelType from '@interfaces/KernelType';

export default function useInteractiveCodeOutput({
  checkKernelStatus,
  code,
  getDefaultMessages,
  onMessage,
  onOpen,
  onRenderOutputCallback,
  shouldConnect = false,
  shouldReconnect,
  uuid,
}: {
  checkKernelStatus?: boolean;
  code?: string;
  getDefaultMessages?: () => KernelOutputType[];
  onMessage?: (message: KernelOutputType, opts?: {
    executionState: ExecutionStateEnum;
    executionStatus: ExecutionStatusEnum;
  }) => void;
  onOpen?: (value: boolean) => void;
  onRenderOutputCallback?: () => void;
  shouldConnect?: boolean;
  shouldReconnect?: (event: any) => boolean;
  uuid: string;
}): {
  connectionState: WebSocketStateEnum;
  kernel: KernelType;
  kernelStatusCheckResults: KernelOutputType[];
  output: JSX.Element;
  sendMessage: (payload: {
    [key: string]: any;
  }) => void;
  shell: JSX.Element;
} {
  const {
    kernel,
  } = useKernel({
    refreshInterval: checkKernelStatus ? 7000 : 0,
    revalidateOnFocus: checkKernelStatus ? true : false,
  });
  const kernelStatusCheckResultsRef = useRef([]);

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

  function renderOutputs(outputs: KernelOutputType[]) {
    if (!outputRootRef?.current) {
      const domNode = document.getElementById(outputRootUUID.current);
      if (domNode) {
        outputRootRef.current = createRoot(domNode);
      }
    }

    if (!outputRootRef?.current) {
      return;
    }

    const outputsGrouped = [];

    let parentID = null;
    let outputsByParentID = [];

    outputs?.slice(-300)?.forEach((output: KernelOutputType) => {
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
      } = output || {
        data: null,
        data_type: null,
        execution_metadata: null,
        msg_id: null,
        msg_type: null,
        parent_message: null,
        uuid: null,
      };
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
              <ComponentWithCallback callback={onRenderOutputCallback}>
                {outputsGrouped}
              </ComponentWithCallback>
            </ErrorProvider>
          </ModalProvider>
        </ThemeProvider>
      </KeyboardContext.Provider>,
    );
  }

  useEffect(() => {
    if (getDefaultMessages) {
      setTimeout(() => {
        messagesRef.current = getDefaultMessages?.();
        if (messagesRef.current) {
          renderOutputs(messagesRef.current);
        }
      }, 1);
    }
  }, []);

  const {
    // lastMessage,
    readyState,
    sendMessage: sendMessageInit,
  } = useWebSocket(getWebSocket(`${uuid}-${user?.id}`), {
    shouldReconnect: (data) => {
      if (shouldReconnect) {
        return shouldReconnect?.(data)
      }
    },
    onOpen: () => onOpen(true),
    onMessage: (messageEvent: {
      data: string;
    }) => {
      const {
        data,
      } = messageEvent;


      if (data) {
        const output = parseRawDataFromMessage(data);
        const arr = dedupe([...messagesRef.current, output], ['msg_id']);

        if (onMessage) {
          onMessage?.(output, getExecutionStatusAndState(getLatestOutputGroup(arr || [])));
        }

        // This comes from checking the kernel and hitting the kernels endpoint.
        if (output?.parent_message?.msg_type === MsgType.USAGE_REQUEST) {
          kernelStatusCheckResultsRef.current = [
            ...kernelStatusCheckResultsRef.current,
            output,
          ].slice(0, 12);
          return;
        }

        messagesRef.current = arr;
        renderOutputs(messagesRef?.current);
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
      <OutputContainerStyle ref={outputContainerRef}>
        <OutputContentStyle
          id={outputRootUUID.current}
          ref={outputContentRef}
          callback={onRenderOutputCallback}
        />
      </OutputContainerStyle>
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
    kernel,
    kernelStatusCheckResults: kernelStatusCheckResultsRef?.current,
    output: outputRoot,
    sendMessage,
    shell,
  };
}
