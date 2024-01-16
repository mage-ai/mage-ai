import tzMoment from 'moment-timezone';
import { createRoot } from 'react-dom/client';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useMonaco } from '@monaco-editor/react';

import dark from '@oracle/styles/themes/dark';
import { ThemeContext } from 'styled-components';
import { ThemeProvider } from 'styled-components'
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import Button from '@oracle/elements/Button';
import FileTabsScroller from '@components/FileTabsScroller';
import ButtonGroup from '@oracle/elements/Button/ButtonGroup';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Divider from '@oracle/elements/Divider';
import FileEditor from '@components/FileEditor';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import { addKeyboardShortcut } from '@components/CodeEditor/keyboard_shortcuts';
import FileEditorHeader, { MENU_ICON_PROPS } from '@components/FileEditor/Header';
import Flex from '@oracle/components/Flex';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET, TIME_FORMAT, momentInLocalTimezone, utcStringToElapsedTime } from '@utils/date';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelHeader from '@components/Kernels/Header';
import KernelOutputType, { ExecutionStateEnum, ExecutionStatusEnum, EXECUTION_STATE_DISPLAY_LABEL_MAPPING, EXECUTION_STATUS_DISPLAY_LABEL_MAPPING, MsgType } from '@interfaces/KernelOutputType';
import Spacing from '@oracle/elements/Spacing';
import StatusFooter from '@components/PipelineDetail/StatusFooter';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import TripleLayout from '@components/TripleLayout';
import useApplicationBase, { ApplicationBaseType } from '../useApplicationBase';
import useInteractiveCodeOutput from '@components/InteractiveCodeOutput/useInteractiveCodeOutput';
import useTripleLayout from '@components/TripleLayout/useTripleLayout';
import useKernel from '@utils/models/kernel/useKernel';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { BlockLanguageEnum } from '@interfaces/BlockType';
import { ContainerStyle } from '../index.style';
import { DISPLAY_LABEL_MAPPING, WebSocketStateEnum } from '@interfaces/WebSocketType';
import { KEY_CODE_ENTER, KEY_CODE_META, KEY_SYMBOL_ENTER, KEY_SYMBOL_M, KEY_SYMBOL_META } from '@utils/hooks/keyboardShortcuts/constants';
import { CircleWithArrowUp, CubeWithArrowDown, PlayButtonFilled, PowerOnOffButton, Terminal as TerminalIcon, PauseV2, Callback } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { executeCode } from '@components/CodeEditor/keyboard_shortcuts/shortcuts';
import { getCode, setCode } from './utils';
import { getItems, setItems } from './storage';
import { keysPresentAndKeysRecent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { useKeyboardContext } from '@context/Keyboard';
import { useModal } from '@context/Modal';
import { selectKeys } from '@utils/hash';

const CURRENT_EXECUTION_STATE_ID = 'CURRENT_EXECUTION_STATE_ID';

function CodeMatrix({
  query,
  ...props
}: ApplicationBaseType & {
   query?: {
    file_path: string;
  };
}) {
  const { interrupt } = useKernel({
    refreshInterval: 0,
    revalidateOnFocus: false,
  });

  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const themeContext = useContext(ThemeContext);

  const editorRef = useRef(null);
  const editorKeyMappingRef = useRef({});

  const outputBottomRef = useRef(null);
  const statusStateRootRef = useRef(null);
  const runButtonRootRef = useRef(null)
  const runButtonRef = useRef(null)
  const executionStateRef = useRef(null);
  const executionStatusRef = useRef(null);
  const currentExecutionStateRootRef = useRef(null);

  const contentRef = useRef(null);
  const onOpenCallbackRef= useRef(null);
  const sendMessageRef = useRef(null);
  const kernelStatusCheckResultsTextRef = useRef(null);

  const [running, setRunning] = useState(false);
  const [language, setLanguage] = useState(BlockLanguageEnum.PYTHON);
  const [openState, setOpen] = useState(false);
  const [pause, setPause] = useState(false);
  const [ready, setReady] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);

  const monaco = useMonaco();

  const onMountCallback = useCallback((editor) => {
    setReady(true);
    editorRef.current = editor;
  }, [monaco]);


  function getCodeForMessage(): string {
    return editorRef?.current?.getValue() || contentRef?.current;
  }

  useEffect(() => {
    if (monaco && ready) {
      editorRef.current.onKeyDown((event) => {
        editorKeyMappingRef.current = {
          ...editorKeyMappingRef.current,
          ...selectKeys(event, [
            'altGraphKey',
            'altKey',
            'code',
            'ctrlKey',
            'keyCode',
            'metaKey',
            'shiftKey',
          ]),
        };
      });

      editorRef.current.addAction({
        id: `${ApplicationExpansionUUIDEnum.CodeMatrix}/run-code`,
        label: 'Run code',
        keybindingContext: null,
        keybindings: [
          // metaKey
          // 3
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
        ],
        precondition: null,
        run: (editor) => {
          const highlightedText = editor.getModel().getValueInRange(editor.getSelection());
          const text = editor.getValue();
          const message = highlightedText || text;

          sendMessageRef?.current?.({
            message: getCodeForMessage(),
          });
        },
      });
    }
  }, [monaco, ready]);

  const shouldReconnect = useCallback(() => {
    return true;
  }, []);

  const onOpen = useCallback((value: boolean) => {
    setOpen(value);

    if (value && !onOpenCallbackRef?.current) {
      onOpenCallbackRef?.current?.();
      onOpenCallbackRef.current = null;
    }
  }, []);

  useApplicationBase(props);
  const {
    containerRef,
    headerOffset: headerOffsetProp,
  } = props;

  const {
    afterInnerRef,
    hiddenAfter,
    hiddenBefore,
    mainContainerRef,
    mousedownActiveAfter,
    mousedownActiveBefore,
    setHiddenAfter,
    setHiddenBefore,
    setMousedownActiveAfter,
    setMousedownActiveBefore,
    setWidthAfter,
    setWidthBefore,
    widthAfter,
    widthBefore,
  } = useTripleLayout(ApplicationExpansionUUIDEnum.CodeMatrix, {
    hiddenAfter: false,
    hiddenBefore: true,
  });

  const onMessage = useCallback((output: KernelOutputType, {
    executionState,
    executionStatus,
  }) => {
    if (MsgType.SHUTDOWN_REQUEST === output?.msg_type) {
      return;
    }

    if (output?.parent_message?.msg_type === MsgType.USAGE_REQUEST) {
      const datetime = momentInLocalTimezone(
        tzMoment(output?.[0]?.execution_metadata?.date),
        displayLocalTimezone,
      ).format(DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET);

      if (kernelStatusCheckResultsTextRef?.current) {
        kernelStatusCheckResultsTextRef.current.innerText = `Last checked ${utcStringToElapsedTime(datetime, true)}`;
      }
      return;
    }

    setItems([output], false);

    executionStateRef.current = executionState;
    executionStatusRef.current = executionStatus;

    renderStatusAndState(output);
  }, []);

  function renderStatusAndState(output: KernelOutputType) {
    if (!statusStateRootRef?.current) {
      const domNode = document.getElementById('CodeMatrix-StatusState');
      if (domNode) {
        statusStateRootRef.current = createRoot(domNode);
      }
    }

    if (statusStateRootRef?.current) {
      statusStateRootRef?.current?.render(
        <div>
          <Text default monospace xsmall>
            Recent run status: <Text
              danger={ExecutionStatusEnum.FAILED === executionStatusRef?.current}
              default={ExecutionStatusEnum.CANCELLED === executionStatusRef?.current}
              inline
              monospace
              muted={ExecutionStatusEnum.PENDING === executionStatusRef?.current}
              success={ExecutionStatusEnum.SUCCESS === executionStatusRef?.current}
              warning={ExecutionStatusEnum.EMPTY_RESULTS === executionStatusRef?.current || ExecutionStatusEnum.CANCELLED === executionStatusRef?.current}
              xsmall
            >
              {EXECUTION_STATUS_DISPLAY_LABEL_MAPPING[executionStatusRef?.current]?.toUpperCase() || 'N/A'}
            </Text>
          </Text>
        </div>
      );
    }

    if (!currentExecutionStateRootRef?.current) {
      const domNode = document.getElementById(CURRENT_EXECUTION_STATE_ID);
      if (domNode) {
        currentExecutionStateRootRef.current = createRoot(domNode);
      }
    }

    if (currentExecutionStateRootRef?.current) {
      currentExecutionStateRootRef?.current?.render(
        <div>
          <Text default monospace xsmall>
            {EXECUTION_STATE_DISPLAY_LABEL_MAPPING[output?.execution_state]}
          </Text>
        </div>
      );
    }
  }

  function scrollTo({
    bottom,
    top,
  }: {
    bottom?: boolean;
    top?: boolean;
  }) {
    setTimeout(() => {
      if (afterInnerRef?.current) {
        if (bottom) {
          afterInnerRef.current.scrollTop = afterInnerRef?.current?.scrollHeight - (
            afterInnerRef?.current?.getBoundingClientRect()?.height
              + outputBottomRef?.current?.getBoundingClientRect()?.height
          );
        } else if (top) {
          afterInnerRef.current.scrollTop = 0;
        }
      }
    }, 1);
  }

  function onRenderOutputCallback() {
    scrollTo({
      bottom: true,
    });
    setRunning(false);
  }

  const {
    clearOutputs,
    connectionState,
    kernel,
    kernelStatusCheckResults,
    output,
    sendMessage,
    shell,
  } = useInteractiveCodeOutput({
    checkKernelStatus: true,
    getDefaultMessages: () => getItems(),
    onMessage,
    onOpen,
    onRenderOutputCallback,
    outputPadding: (
      <div
        ref={outputBottomRef}
        style={{ height: mainContainerRef?.current?.getBoundingClientRect()?.height }}
      />
    ),
    shouldConnect,
    shouldReconnect,
    uuid: `code/${ApplicationExpansionUUIDEnum.CodeMatrix}`,
  });
  sendMessageRef.current = sendMessage;

  const open = useMemo(() => openState && WebSocketStateEnum.OPEN === connectionState, [
    connectionState,
    openState,
  ]);

  const fileEditor = useMemo(() => {
    console.log('FILE EDITOR REDNER');
    return (
      <FileEditor
        active
        file={{
          content: (getCode(language) || '') as string,
          uuid: ApplicationExpansionUUIDEnum.CodeMatrix,
          name: ApplicationExpansionUUIDEnum.CodeMatrix,
          language,
        }}
        contained
        containerRef={containerRef}
        disableRefreshWarning
        hideHeaderButtons
        onContentChange={(content: string) => {
          contentRef.current = content;
          setCode(language, content);
        }}
        onMountCallback={(editor) => {
          onMountCallback(editor);
        }}
        saveFile={() => false}
      />
    );
  }, [language, onMountCallback]);

  const menuGroups = useMemo(() => {
    return [
      {
        uuid: 'File',
        items: [
          {
            beforeIcon: <TerminalIcon {...MENU_ICON_PROPS} />,
            uuid: 'TBD',
            onClick: (opts) => {
              console.log(opts);
            },
          },
        ],
      },
    ];
  }, [
  ]);

  const menuMemo = useMemo(() => (
    <FlexContainer alignItems="center" justifyContent="space-between">
      <Flex flex={1}>
        <FileEditorHeader
          menuGroups={menuGroups}
        />

        <Spacing mr={1} />

        <KernelHeader
          outputs={kernelStatusCheckResults}
          refreshInterval={0}
          revalidateOnFocus={false}
        />

        <Spacing mr={1} />

        <Flex alignItems="center">
          <Tooltip
            block
            description={(!open || !shouldConnect) && (
              <>
                {!shouldConnect && (
                  <Text warning small>
                    Turn on the WebSocket connection before coding
                  </Text>
                )}
                {shouldConnect && !open && (
                  <Text warning small>
                    WebSocket connection isn’t open yet
                  </Text>
                )}
              </>
            )}
            forceVisible={!(open && shouldConnect)}
            size={null}
            visibleDelay={300}
            widthFitContent
          >
            <Button
              beforeIcon={(
                <PowerOnOffButton
                  danger={!(open && shouldConnect)}
                  size={1.25 * UNIT}
                  success={open && shouldConnect}
                />
              )}
              onClick={() => setShouldConnect(prev => !prev)}
              compact
              secondary
              small
            >
              <Text monospace noWrapping small>
                WebSocket {DISPLAY_LABEL_MAPPING[connectionState]?.toLowerCase()}
              </Text>
            </Button>
          </Tooltip>

          <Spacing mr={1} />

          <Text default monospace xsmall ref={kernelStatusCheckResultsTextRef} />
        </Flex>
      </Flex>

      <FlexContainer justifyContent="flex-end" id={CURRENT_EXECUTION_STATE_ID} />

      <Spacing mr={1} />
    </FlexContainer>
  ), [
    connectionState,
    kernelStatusCheckResults,
    menuGroups,
    open,
    shouldConnect,
  ]);

  // const uuidKeyboard = ApplicationExpansionUUIDEnum.CodeMatrix;
  // const { registerOnKeyDown, registerOnKeyUp, unregisterOnKeyDown, unregisterOnKeyUp } = useKeyboardContext();

  // useEffect(() => () => {
  //   unregisterOnKeyDown(uuidKeyboard);
  //   unregisterOnKeyUp(uuidKeyboard);
  // }, [unregisterOnKeyDown, unregisterOnKeyUp, uuidKeyboard]);

  // registerOnKeyUp(uuidKeyboard, (event, keyMapping, keyHistory) => {

  //   // if (keyMapping[KEY_CODE_META]) {
  //   //   console.log('Pausing event');
  //   //   event.preventDefault();
  //   //   setPause(true);
  //   // }

  //   if (keysPresentAndKeysRecent([KEY_CODE_ENTER], [KEY_CODE_META], keyMapping, keyHistory, {
  //     lookback: 2,
  //   })) {
  //     console.log('Running code from CodeMatrix keyboard shortcuts.');
  //     if (shouldConnect) {
  //       sendMessage({
  //         message: contentRef.current,
  //       });
  //     } else {
  //       onOpenCallbackRef.current = () => {
  //         sendMessage({
  //           message: contentRef.current,
  //         });
  //       };
  //       setShouldConnect(true);
  //     }
  //   }
  // }, []);

  const footer = useMemo(() => {
    return (
      <StatusFooter
        inline
        refreshInterval={0}
        revalidateOnFocus={false}
      >
        <Flex flexDirection="column" id="CodeMatrix-StatusState" />
      </StatusFooter>
    );
  }, [
  ]);

  const afterOutputMemo = useMemo(() => (
    <div>
      {console.log("AFTER OUTPUT")}
      {output}
      {shell}
    </div>
  ), [
    output,
    shell,
  ]);

  const afterHeaderMemo = useMemo(() => {
    const items = [
      <Spacing ml={1} id="CodeMatrix-RunButton">
        <FlexContainer alignItems="center">
          <Button
            beforeIcon={<PlayButtonFilled success />}
            secondary
            compact
            small
            ref={runButtonRef}
            loading={running}
            onClick={() => {
              executionStateRef.current = ExecutionStateEnum.QUEUED;

              if (!open || !shouldConnect) {
                onOpenCallbackRef.current = () => {
                  sendMessage({
                    message: getCodeForMessage(),
                  });
                };
                setRunning(true);
                setShouldConnect(true);
              } else {
                setRunning(true);
                sendMessage({
                  message: getCodeForMessage(),
                });
              }
            }}
          >
            Execute code
          </Button>

          <div style={{ marginRight: 4 }} />

          <KeyboardTextGroup
            addPlusSignBetweenKeys
            compact
            keyTextGroups={[[KEY_SYMBOL_META, KEY_SYMBOL_ENTER]]}
            monospace
            small
          />

          <Spacing mr={1} />
        </FlexContainer>
      </Spacing>,
    ];

    if (running) {
      items.push(
      );
    }

    items.push(...[
      <Spacing ml={1} id="CodeMatrix-RunButton">
        <ButtonGroup>
          <Button
            beforeIcon={<CircleWithArrowUp active />}
            compact
            small
            secondary
            onClick={() => {
              scrollTo({ top: true });
            }}
          >
            Go to top
          </Button>
          <Button
            beforeIcon={<CubeWithArrowDown active />}
            compact
            small
            secondary
            onClick={() => {
              scrollTo({ bottom: true });
            }}
          >
            Go down
          </Button>
        </ButtonGroup>
      </Spacing>,
      <Spacing ml={1} id="CodeMatrix-RunButton">
        <Button
          beforeIcon={<Callback default />}
          compact
          small
          secondary
          onClick={() => {
            clearOutputs();
            setItems([], true);
          }}
        >
          Clear outputs
        </Button>
      </Spacing>,
      <Spacing ml={1} id="CodeMatrix-RunButton">
        <Button
          disabled={executionStateRef?.current === ExecutionStateEnum.IDLE}
          beforeIcon={<PauseV2 warning />}
          compact
          small
          onClick={() => {
            executionStateRef.current = null;
            setRunning(false);
            interrupt();
          }}
        >
          Stop execution
        </Button>
      </Spacing>,
    ]);

    return (
      <FileTabsScroller
        fileTabs={[items]}
      />
    );
  }, [open, shouldConnect, sendMessage, running]);

  return (
    <ContainerStyle>
      <TripleLayout
        after={afterOutputMemo}
        afterCombinedWithMain
        afterDividerContrast
        afterHeader={afterHeaderMemo}
        afterHeightOffset={0}
        afterHidden={hiddenAfter}
        afterInnerRef={afterInnerRef}
        afterMousedownActive={mousedownActiveAfter}
        afterWidth={widthAfter}
        autoLayout
        before={(
          <div />
        )}
        beforeContentHeightOffset={headerOffsetProp}
        beforeDividerContrast
        // beforeHeader={(
        //   <FlexContainer alignItems="center" justifyContent="space-between">
        //     <ButtonTabs
        //       allowScroll
        //       onClickTab={(tab: TabType) => {
        //         setSelectedTab?.(tab);
        //       }}
        //       selectedTabUUID={selectedTab?.uuid}
        //       tabs={FILE_BROWSER_TABS}
        //       underlineColor="#4877FF"
        //       underlineStyle
        //       uppercase={false}
        //     />
        //   </FlexContainer>
        // )}
        beforeHeightOffset={0}
        beforeHidden={hiddenBefore}
        beforeMousedownActive={mousedownActiveBefore}
        beforeWidth={widthBefore}
        contained
        containerRef={containerRef}
        inline
        mainContainerFooter={footer}
        mainContainerHeader={(
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
          </div>
        )}
        mainContainerRef={mainContainerRef}
        noBackground
        setAfterHidden={setHiddenAfter}
        setAfterMousedownActive={setMousedownActiveAfter}
        setAfterWidth={setWidthAfter}
        setBeforeHidden={setHiddenBefore}
        setBeforeMousedownActive={setMousedownActiveBefore}
        setBeforeWidth={setWidthBefore}
        uuid={ApplicationExpansionUUIDEnum.CodeMatrix}
      >
        {fileEditor}
      </TripleLayout>
    </ContainerStyle>
  );
}

export default CodeMatrix;
