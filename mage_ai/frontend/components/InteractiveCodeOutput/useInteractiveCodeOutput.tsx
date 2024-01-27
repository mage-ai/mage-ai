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
import OutputGroup, { ROW_GROUP_HEADER_CLASS_NAME } from './Output';
import { STICKY_HEADER } from './Output/index.style';
import useArrowNavigation, { NavigationDirectionEnum } from '@utils/useArrowNavigation';
import useContextMenu from '@utils/useContextMenu';
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
import { delay } from '@utils/delay';
import { KeyValueType } from '@interfaces/CommandCenterType';

const OUTPUT_ACTIVE_MODE_CLASS_NAME = 'active-group';
const SELECTED_ROW_GROUP_CLASS_NAME = 'row-group-selected';

export default function useInteractiveCodeOutput({
  checkKernelStatus = false,
  containerRef,
  getDefaultMessages,
  onMessage,
  onOpen,
  onRenderOutputCallback,
  onRenderOutputFocusedCallback,
  onActiveateGroupOfOutputs,
  onDeactivateGroupOfOutputs,
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
  onActiveateGroupOfOutputs?: (opts?: GroupOfOutputsType) => void;
  onDeactivateGroupOfOutputs?: (opts?: GroupOfOutputsType) => void;
  onOpen?: (value: boolean) => void;
  onRenderOutputCallback?: () => void;
  onRenderOutputFocusedCallback?: () => void;
  shouldConnect?: boolean;
  shouldReconnect?: (event: any) => boolean;
  uuid: string;
}): {
  clearOutputs: () => void;
  connectionState: WebSocketStateEnum;
  deactivateGroup: () => void;
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
  const messagesBookmarkIndexRef = useRef(null);

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

  function isActive(): boolean {
    return !!selectedGroupOfOutputs?.current?.active;
  }

  // function onNavigation(direction: NavigationDirectionEnum, units: number, next, prev) {
  //   console.log(direction, units, next, prev)
  //   // if group is activated and they go left, deactivate it
  //   if (selectedGroupOfOutputs?.current?.active && NavigationDirectionEnum.LEFT === direction) {
  //     deactivateGroup();
  //   } else if (selectedGroupOfOutputs?.current && NavigationDirectionEnum.RIGHT === direction)  {
  //     // if group is highlighted and arrow is right, activate it
  //     handleClickGroup(selectedGroupOfOutputs?.current);
  //   } else if ([NavigationDirectionEnum.UP, NavigationDirectionEnum.DOWN].includes(direction)) {
  //     handleClickGroup(next);
  //   }
  // }

  // function shouldNavigate(event: KeyboardEvent): boolean {

  // }
  // const rowsRef = useRef({});
  // const columnsRef = useRef({});
  // const shape

  // const {
  //   registerElements,
  // } = useArrowNavigation({
  //   onNavigation,
  //   shouldNavigate,
  //   uuid: `${uuid}-useArrowNavigation`,
  // });


  // function registerTracking(uuid: string, {
  //   rows: number,
  //   columns: number,
  // }: defaultIndexes: {
  //   row?: number;
  //   column?: number;
  // }) {

  // }
  // function deregisterTracking(uuid: string) {

  // }

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
      const ref = isActive() ? outputFocusedContainerRef : containerRef;

      if (ref?.current) {
        if (bottom !== null) {
          ref.current.scrollTo({
            top: bottom === true
              ? ref?.current?.scrollHeight - ref?.current?.getBoundingClientRect()?.height
              : Number(bottom),
            behavior: smooth ? 'smooth' : 'instant',
          })
        } else if (top !== null) {
          ref.current.scrollTo({
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

  function setupGroups(): Promise<any> {
    return new Promise((resolve) => {
      return resolve(delay(300).then(() => {
        [
          outputContainerRef,
          outputFocusedContainerRef,
        ].forEach((ref) => {
          if (ref?.current) {
            if (isActive()) {
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

        if (isActive()) {
          removeSelectedFromAllRowGroups();
          renderOutputs(selectedGroupOfOutputs?.current?.outputs);
        } else if (getDefaultMessages) {
          messagesRef.current = getDefaultMessages?.();
          if (messagesRef.current) {
            renderOutputs(messagesRef.current);
          }
        }
      }));
    });
  }

  function deactivateGroup() {
    if (onDeactivateGroupOfOutputs) {
      onDeactivateGroupOfOutputs?.(selectedGroupOfOutputs?.current);
    }
    messagesBookmarkIndexRef.current = null;
    selectedGroupOfOutputs.current = null;
    // Clear the output focus.
    renderOutputsFocused([]);

    setupGroups().then(() => {
      scrollOutputTo({
        bottom: true,
      }, false);
    });
  }

  function handleClickGroup(data: GroupOfOutputsType) {
    const groupID = data?.groupID;

    removeSelectedFromAllRowGroups();

    let shouldHighlight = true;

    // Click twice to activate group
    if (selectedGroupOfOutputs?.current?.groupID === groupID) {
      const alreadyActive = isActive();
      if (selectedGroupOfOutputs?.current?.deactivate) {
        deactivateGroup();
        shouldHighlight = false;
        // If row is highlighted and arrow is right, activate group
      } else if (alreadyActive) {
        selectedGroupOfOutputs.current = {
          deactivate: true,
          ...selectedGroupOfOutputs.current,
        };
      } else {
        setupGroups();
        selectedGroupOfOutputs.current = { active: true, ...data };

        if (onActiveateGroupOfOutputs) {
          onActiveateGroupOfOutputs?.(selectedGroupOfOutputs?.current);
        }
      }
    } else {
      selectedGroupOfOutputs.current = { active: false, ...data };
    }

    if (shouldHighlight) {
      delay(1).then(() => {
        if (outputGroupRefs?.current?.[groupID]?.current) {
          const ref = outputGroupRefs?.current?.[groupID];
          ref.current.className = addClassNames(
            ref?.current?.className || '',
            [
              SELECTED_ROW_GROUP_CLASS_NAME,
            ],
          );
        }
      });
    }
  }

  function groupOutputsTogether(outputs: KernelOutputType[]): GroupOfOutputsType[] {
    const groups: GroupOfOutputsType[] = groupOutputsAndSort(outputs);
    const groupsCount = groups?.length;

    return groups?.map(({
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
          key={`${groupID}-${index}`}
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
          }}
          outputs={outputs}
          ref={ref}
        />
      );
    });
  }

  function renderOutputsFocused(outputs: KernelOutputType[]) {
    // If active, render new messages in the bottom half using the output focused root.
    if (!outputFocusedRootRef?.current) {
      const domNode = document.getElementById(outputFocusedRootUUID.current);
      if (domNode) {
        outputFocusedRootRef.current = createRoot(domNode);
      }
    }

    if (!outputFocusedRootRef?.current) {
      console.log('[ERROR] InteractiveCodeOutput: output focused root doesn’t exist.');
    }

    renderUsingRoot(
      outputFocusedRootRef,
      groupOutputsTogether(outputs),
      () => onRenderOutputFocusedCallback ? onRenderOutputFocusedCallback?.() : null,
    );
  }

  function renderOutputs(outputs: KernelOutputType[]) {
    // If active, render new messages in the bottom half using the output focused root.
    if (!outputRootRef?.current) {
      const domNode = document.getElementById(outputRootUUID.current);
      if (domNode) {
        outputRootRef.current = createRoot(domNode);
      }
    }

    if (!outputRootRef?.current) {
      console.log('[ERROR] InteractiveCodeOutput: output root doesn’t exist.');
    }

    renderUsingRoot(
      outputRootRef,
      groupOutputsTogether(outputs),
      () => onRenderOutputCallback ? onRenderOutputCallback?.() : null,
    );
  }

  function renderUsingRoot(rootRef, outputsGrouped, callback?: () => void) {
    rootRef?.current?.render(
      <KeyboardContext.Provider value={keyboardContext}>
        <ThemeProvider theme={themeContext}>
          <ModalProvider>
            <ErrorProvider>
              <ComponentWithCallback callback={callback}>
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

  function handleScroll() {
    const yC = containerRef?.current?.getBoundingClientRect()?.y;
    document.querySelectorAll(`.${ROW_GROUP_HEADER_CLASS_NAME}`)?.forEach((ref) => {
      const rect = ref?.getBoundingClientRect();
      if ((rect?.y - rect?.height) <= yC) {
        ref.className = addClassNames(
          ref.className,
          [
            STICKY_HEADER,
          ],
        );
      } else {
        ref.className = removeClassNames(
          ref.className,
          [
            STICKY_HEADER,
          ],
        );
      }
    });
  }

  useEffect(() => {
    delay(5000).then(() => {
      setupGroups();
    });

    if (typeof window !== 'undefined') {

      setTimeout(() => containerRef?.current?.addEventListener('scroll', handleScroll), 3000);

      return () => containerRef?.current?.removeEventListener('scroll', handleScroll);
    }
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
        if (isActive()) {
          if (messagesBookmarkIndexRef?.current === null) {
            messagesBookmarkIndexRef.current = messagesRef?.current?.length || 0;
          }
        } else {
          messagesBookmarkIndexRef.current = null;
        }

        // If the output is a status message, and the previous message is a status message,
        messagesRef.current = arr;

        let outputsToRender = arr;


        if (isActive()) {
          outputsToRender = outputsToRender?.slice(messagesBookmarkIndexRef?.current || 0);
          //  Render new messages in the bottom half and keep rendering the active group’s
          // outputs in the top half.
          renderOutputsFocused(outputsToRender);
        } else {
          renderOutputs(outputsToRender);
        }

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
      <OutputContainerStyle key={`${uuid}-${outputRootUUID}-output`} ref={outputContainerRef}>
        <OutputContentStyle
          id={outputRootUUID.current}
          ref={outputContentRef}
          callback={onRenderOutputCallback}
        />
      </OutputContainerStyle>
    );
  }, []);

  const outputFocusedRoot = useMemo(() => {
    return (
      <OutputContainerStyle key={`${uuid}-${outputFocusedRootUUID}-output-focused`} ref={outputFocusedContainerRef}>
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
    deactivateGroup,
    kernel,
    kernelStatusCheckResults: kernelStatusCheckResultsRef?.current,
    interruptKernel: interrupt,
    output: outputRoot,
    outputFocused: outputFocusedRoot,
    scrollOutputTo,
    sendMessage,
  };
}
