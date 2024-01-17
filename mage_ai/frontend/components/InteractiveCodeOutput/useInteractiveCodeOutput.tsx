import useWebSocket from 'react-use-websocket';
import { GridThemeProvider } from 'styled-bootstrap-grid';
import { ThemeContext } from 'styled-components';
import { ThemeProvider } from 'styled-components';
import { createRoot } from 'react-dom/client';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import mock from './mock';
import AuthToken from '@api/utils/AuthToken';
import KernelOutputType, { ExecutionStateEnum, ExecutionStatusEnum, MsgType } from '@interfaces/KernelOutputType';
import KeyboardContext from '@context/Keyboard';
import OutputGroup from './Output';
import Shell from './Shell';
import useKernel from '@utils/models/kernel/useKernel';
import ComponentWithCallback from '@components/shared/ComponentWithCallback';
import { addClassNames, removeClassNames } from '@utils/elements';
import { ErrorProvider } from '@context/Error';
import { ModalProvider } from '@context/Modal';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { OutputContainerStyle, OutputContentStyle, ShellContainerStyle, ShellContentStyle } from './index.style';
import { READY_STATE_MAPPING, WebSocketStateEnum } from '@interfaces/WebSocketType';
import { dedupe } from '@utils/array';
import { getUser } from '@utils/session';
import { getWebSocket } from '@api/utils/url';
import { parseRawDataFromMessage } from '@utils/models/kernel/utils';
import { groupOutputsAndSort, getLatestOutputGroup, getExecutionStatusAndState } from './Output/utils';
import KernelType from '@interfaces/KernelType';

export default function useInteractiveCodeOutput({
  checkKernelStatus,
  code,
  getDefaultMessages,
  onClickOutputGroup,
  onMessage,
  onOpen,
  onRenderOutputCallback,
  onRenderShellCallback,
  shouldConnect = false,
  shouldReconnect,
  uuid,
}: {
  checkKernelStatus?: boolean;
  code?: string;
  getDefaultMessages?: () => KernelOutputType[];
  onClickOutputGroup?: (e: Event, opts?: {
    dates: string[];
    groupID: number;
    groupsCount: number;
    index: number;
    outputs: KernelOutputType[];
  }) => void;
  onMessage?: (message: KernelOutputType, opts?: {
    executionState: ExecutionStateEnum;
    executionStatus: ExecutionStatusEnum;
  }) => void;
  onOpen?: (value: boolean) => void;
  onRenderOutputCallback?: () => void;
  onRenderShellCallback?: () => void;
  shouldConnect?: boolean;
  shouldReconnect?: (event: any) => boolean;
  uuid: string;
}): {
  clearOutputs: () => void;
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

  const selectedGroupOfOutputs = useRef();
  const messagesRef = useRef([]);
  const outputContainerRef = useRef(null);
  const outputContentRef = useRef(null);
  const outputItemsRef = useRef([]);
  const outputRootRef = useRef(null);
  const outputRootUUID = useRef(`${uuid}-output-root`);

  const messagesShellRef = useRef([]);
  const shellContainerRef = useRef(null);
  const shellContentRef = useRef(null);
  const shellItemsRef = useRef([]);
  const shellRootRef = useRef(null);
  const shellRootUUID = useRef(`${uuid}-shell-root`);

  const outputBottomRef = useRef(null);

  function isAnyOutputGroupSelected() {
    return !!selectedGroupOfOutputs?.current?.active;
  }

  console.log(selectedGroupOfOutputs?.current?.outputs?.map(o => o?.msg_id))

  function removeSelectedFromAllRowGroups() {
    if (typeof document !== 'undefined') {
      const refs = [
        ...document.querySelectorAll('.row-group-selected'),
      ];
      refs?.forEach((ref) => {
        if (ref) {
          ref.className = removeClassNames(
            ref.className || '',
            [
              'row-group-selected',
            ],
          );
        }
      });
    }
  }

  function setupGroups() {
    setTimeout(() => {
      const active = isAnyOutputGroupSelected();
      [
        outputContainerRef,
        shellContainerRef,
      ].forEach((ref) => {
        if (ref?.current) {
          if (active) {
            ref.current.className = addClassNames(
              ref.current.className || '',
              [
                'inline',
              ],
            );
          } else {
            ref.current.className = removeClassNames(
              ref.current.className || '',
              [
                'inline',
              ],
            );
          }
        }
      });

      if (active) {
        removeSelectedFromAllRowGroups();
        renderOutputs(selectedGroupOfOutputs?.current?.outputs);
      } else if (getDefaultMessages) {
        messagesRef.current = getDefaultMessages?.();
        if (messagesRef.current) {
          renderOutputs(messagesRef.current);
        }
      }
    }, 300);
  }

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

    const groups = groupOutputsAndSort(outputs);
    const groupsCount = groups?.length;
    const outputsGrouped = groups?.map(({
      dates,
      groupID,
      outputs,
    }, index) => (
      <OutputGroup
        dates={dates}
        groupsCount={groupsCount}
        index={index}
        key={groupID}
        groupID={groupID}
        onClick={(e) => {
          removeSelectedFromAllRowGroups();

          if (e?.currentTarget) {
            e.currentTarget.className = addClassNames(
              e?.currentTarget?.className || '',
              [
                'row-group-selected',
              ],
            );
          }

          const data = {
            dates,
            groupsCount,
            index,
            groupID,
            outputs,
          };

          if (!isAnyOutputGroupSelected()) {
            if (selectedGroupOfOutputs?.current && selectedGroupOfOutputs?.current?.groupID === groupID) {
              selectedGroupOfOutputs.current = { active: true, ...data };;
              console.log(selectedGroupOfOutputs.current)
            } else {
              selectedGroupOfOutputs.current = { active: false, ...data };
            }
          }

          if (onClickOutputGroup) {
            onClickOutputGroup?.(e, data);
          }

          setupGroups();
        }}
        outputs={outputs}
      />
    ));

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

  function clearOutputs() {
    messagesRef.current = [];
    renderOutputs([]);
  }

  useEffect(() => {
    setupGroups();
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
    onMessage: (messageEvent: { data: string }) => {
      if (!messageEvent?.data) {
        return;
      }

      const output = parseRawDataFromMessage(messageEvent?.data);

      // // Is the next output a status message, and is the one before not a status message,
      // //  from another group and only a status message?
      // // If so, filter it out.
      // if (output?.msg_type === MsgType.STATUS) {
      //   const prev = messagesRef?.current?.slice(-1)?.[0];
      //   if (prev?.msg_type !== MsgType.STATUS
      //     && output?.parent_message?.msg_id !== prev?.parent_message?.msg_id) {
      //     return;
      //   }
      // }

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
      } else if (MsgType.SHUTDOWN_REQUEST === output?.msg_id) {
        return;
      } else if (isAnyOutputGroupSelected()) {
        console.log('HANDLE MESSAGES WHEN OUTPUT GROUP SELECTED');
      } else {
        messagesRef.current = arr;
        renderOutputs(arr);
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

  const shellRoot = useMemo(() => {
    return (
      <ShellContainerStyle ref={shellContainerRef} messagesRef={messagesRef}>
        <ShellContentStyle
          id={shellRootUUID.current}
          ref={shellContentRef}
          callback={onRenderShellCallback}
        />
        <div ref={outputBottomRef} />
      </ShellContainerStyle>
    );
  }, []);

  return {
    clearOutputs,
    connectionState: READY_STATE_MAPPING[readyState],
    kernel,
    kernelStatusCheckResults: kernelStatusCheckResultsRef?.current,
    output: outputRoot,
    sendMessage,
    shell: shellRoot,
  };
}
