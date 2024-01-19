import useWebSocket from 'react-use-websocket';
import { ThemeContext } from 'styled-components';
import { ThemeProvider } from 'styled-components';
import { createRef, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import AuthToken from '@api/utils/AuthToken';
import ComponentWithCallback from '@components/shared/ComponentWithCallback';
import KernelOutputType, { RawEventOutputDataType, ExecutionStateEnum, ExecutionStatusEnum, GroupOfOutputsType, MsgType } from '@interfaces/KernelOutputType';
import KernelType from '@interfaces/KernelType';
import KeyboardContext from '@context/Keyboard';
import OutputGroup from './Output';
import useKernel from '@utils/models/kernel/useKernel';
import { ErrorProvider } from '@context/Error';
import { KEY_CODE_ESCAPE } from '@utils/hooks/keyboardShortcuts/constants';
import { ModalProvider } from '@context/Modal';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { OutputContainerStyle, OutputContentStyle, ShellContainerStyle, ShellContentStyle } from './index.style';
import { READY_STATE_MAPPING, WebSocketStateEnum } from '@interfaces/WebSocketType';
import { RefType } from '@interfaces/ElementType';
import { addClassNames, removeClassNames } from '@utils/elements';
import { dedupe } from '@utils/array';
import { getUser } from '@utils/session';
import { getWebSocket } from '@api/utils/url';
import { groupOutputsAndSort, getLatestOutputGroup, getExecutionStatusAndState } from './Output/utils';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { parseRawDataFromMessage } from '@utils/models/kernel/utils';
import { pauseEvent } from '@utils/events';
import { useKeyboardContext } from '@context/Keyboard';
import { KeyValueType } from '@interfaces/CommandCenterType';

const SELECTED_ROW_GROUP_CLASS_NAME = 'row-group-selected';
const OUTPUT_ACTIVE_MODE_CLASS_NAME = 'inline';

export default function useInteractiveCodeOutput({
  checkKernelStatus = false,
  containerRef,
  getDefaultMessages,
  onMessage,
  onOpen,
  onRenderOutputCallback,
  onRenderOutputFocusedCallback,
  onSelectActiveGroupOfOutputs,
  shouldConnect = true,
  shouldReconnect,
  uuid,
}: {
  checkKernelStatus?: boolean;
  containerRef?: RefType;
  getDefaultMessages?: () => KernelOutputType[];
  onMessage?: (message: KernelOutputType, opts?: {
    executionState: ExecutionStateEnum;
    executionStatus: ExecutionStatusEnum;
  }) => void;
  onSelectActiveGroupOfOutputs?: (opts?: GroupOfOutputsType) => void;
  onOpen?: (value: boolean) => void;
  onRenderOutputCallback?: () => void;
  onRenderOutputFocusedCallback?: () => void;
  shouldConnect?: boolean;
  shouldReconnect?: (event: any) => boolean;
  uuid: string;
}): {
  clearOutputs: () => void;
  connectionState: WebSocketStateEnum;
  kernel: KernelType;
  kernelStatusCheckResults: KernelOutputType[];
  interruptKernel: () => void;
  output: JSX.Element;
  outputFocused: JSX.Element;
  scrollOutputTo: (opts?: {
    bottom?: boolean;
    top?: boolean;
  }, smooth?: boolean) => void;
  sendMessage: (payload: KeyValueType) => void;
} {
  const {
    kernel,
    interrupt,
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

  const outputGroupRefs = useRef({});

  const outputRootUUID = useRef(`${uuid}-output-root`);
  const outputRootRef = useRef(null);
  const outputContainerRef = useRef(null);
  const outputContentRef = useRef(null);
  const outputBottomRef = useRef(null);

  const outputFocusedRootUUID = useRef(`${uuid}-output-focused-root`);
  const outputFocusedRootRef = useRef(null);
  const outputFocusedContainerRef = useRef(null);
  const outputFocusedContentRef = useRef(null);

  const {
    registerOnKeyDown,
    setDisableGlobalKeyboardShortcuts,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuid);
  }, [unregisterOnKeyDown, uuid]);

  registerOnKeyDown(uuid, (event, keyMapping, keyHistory) => {
    if (onlyKeysPresent([KEY_CODE_ESCAPE], keyMapping) && !!selectedGroupOfOutputs?.current) {
      pauseEvent(event);
      selectedGroupOfOutputs.current = null;
      setupGroups();
      removeSelectedFromAllRowGroups();
    }
  }, []);

  function scrollOutputTo({
    bottom = null,
    top = null,
  }: {
    bottom?: number | boolean;
    top?: number | boolean;
  }, smooth: boolean = true) {
    setTimeout(() => {
      if (containerRef?.current) {
        if (bottom !== null) {
          containerRef.current.scrollTo({
            top: bottom === true
              ? containerRef?.current?.scrollHeight - containerRef?.current?.getBoundingClientRect()?.height
              : Number(bottom),
            behavior: smooth ? 'smooth' : 'instant',
          })
        } else if (top !== null) {
          containerRef.current.scrollTo({
            top: top === true ? 0 : Number(top),
            behavior: smooth ? 'smooth' : 'instant',
          });
        }
      }
    }, 1);
  }

  function removeSelectedFromAllRowGroups() {
    if (typeof document !== 'undefined') {
      const refs = [
        ...document.querySelectorAll(`.${SELECTED_ROW_GROUP_CLASS_NAME}`),
      ];
      refs?.forEach((ref) => {
        if (ref) {
          ref.className = removeClassNames(
            ref.className,
            [
              SELECTED_ROW_GROUP_CLASS_NAME,
            ],
          );
        }
      });
    }
  }

  function setupGroups() {
    setTimeout(() => {
      [
        outputContainerRef,
        outputFocusedContainerRef,
      ].forEach((ref) => {
        if (ref?.current) {
          if (active) {
            ref.current.className = addClassNames(
              ref.current.className || '',
              [
                OUTPUT_ACTIVE_MODE_CLASS_NAME,
              ],
            );
          } else {
            ref.current.className = removeClassNames(
              ref.current.className || '',
              [
                OUTPUT_ACTIVE_MODE_CLASS_NAME,
              ],
            );
          }
        }
      });

      const active = selectedGroupOfOutputs?.current?.active;
      if (active) {
        removeSelectedFromAllRowGroups();
        renderOutputs(selectedGroupOfOutputs?.current?.outputs);
      }

      if (getDefaultMessages) {
        messagesRef.current = getDefaultMessages?.();
        if (messagesRef.current) {
          renderOutputs(messagesRef.current);
        }
      }
    }, 300);
  }

  function handleClickGroup(data: GroupOfOutputsType) {
    const {
      groupID,
    } = data;

    removeSelectedFromAllRowGroups();

    setTimeout(() => {
      if (outputGroupRefs?.current?.[groupID]?.current) {
        const ref = outputGroupRefs?.current?.[groupID];
        ref.current.className = addClassNames(
          ref?.current?.className || '',
          [
            SELECTED_ROW_GROUP_CLASS_NAME,
          ],
        );
      }
    }, 1);

    // Click twice to activate group
    if (selectedGroupOfOutputs?.current?.groupID === groupID) {
      const alreadyActive = selectedGroupOfOutputs?.current?.active;
      if (!alreadyActive) {
        setupGroups();
        selectedGroupOfOutputs.current = { active: true, ...data };
      }
    } else {
      selectedGroupOfOutputs.current = { active: false, ...data };
    }
  }

  function renderOutputs(outputs: KernelOutputType[]) {
    if (!outputRootRef?.current) {
      const domNode = document.getElementById(outputRootUUID.current);
      if (domNode) {
        outputRootRef.current = createRoot(domNode);
      }
    }

    if (!outputRootRef?.current) {
      console.log('[ERROR] InteractiveCOdeOutput: output root doesn’t exist.');
    }

    const groups: GroupOfOutputsType[] = groupOutputsAndSort(outputs);
    const groupsCount = groups?.length;
    const outputsGrouped = groups?.map(({
      dates,
      groupID,
      outputs,
    }, index) => {
      outputGroupRefs.current[groupID] = outputGroupRefs?.current?.[groupID] || createRef();
      const ref = outputGroupRefs?.current?.[groupID];

      return (
        <OutputGroup
          dates={dates}
          groupsCount={groupsCount}
          index={index}
          key={groupID}
          groupID={groupID}
          onClick={(e) => {
            const data: GroupOfOutputsType = {
              dates,
              groupsCount,
              index,
              groupID,
              outputs,
            };
            handleClickGroup(data);

            if (onSelectActiveGroupOfOutputs) {
              onSelectActiveGroupOfOutputs?.(data);
            }
          }}
          outputs={outputs}
          ref={ref}
        />
      );
    });

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
    heartbeat: {
      message: 'ping',
      returnMessage: 'pong',
      timeout: 60000,
      interval: 25000,
    },
    shouldReconnect: (data) => {
      if (shouldReconnect) {
        return shouldReconnect?.(data)
      } else {
        return true;
      }
    },
    onOpen: () => onOpen && onOpen?.(true),
    onMessage: (messageEvent: RawEventOutputDataType) => {
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
      } else {
        messagesRef.current = arr;
        renderOutputs(arr);
        scrollOutputTo({
          bottom: true,
        }, false);
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
      <div>
        <OutputContainerStyle ref={outputContainerRef}>
          <OutputContentStyle
            id={outputRootUUID.current}
            ref={outputContentRef}
            callback={onRenderOutputCallback}
          />
        </OutputContainerStyle>

        <div ref={outputBottomRef} />
      </div>
    );
  }, []);

  const outputFocusedRoot = useMemo(() => {
    return (
      <OutputContainerStyle ref={outputFocusedContainerRef}>
        <OutputContentStyle
          id={outputFocusedRootUUID.current}
          ref={outputFocusedContentRef}
          callback={onRenderOutputFocusedCallback}
        />
      </OutputContainerStyle>
    );
  }, []);

  return {
    clearOutputs,
    connectionState: READY_STATE_MAPPING[readyState],
    kernel,
    kernelStatusCheckResults: kernelStatusCheckResultsRef?.current,
    interruptKernel: interrupt,
    output: outputRoot,
    outputFocused: outputFocusedRoot,
    scrollOutputTo,
    sendMessage,
  };
}
