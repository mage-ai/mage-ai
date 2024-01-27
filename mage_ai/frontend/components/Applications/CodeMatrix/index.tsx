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
import Loading, { LoadingStyleEnum } from '@oracle/components/Loading';
import { addKeyboardShortcut } from '@components/CodeEditor/keyboard_shortcuts';
import FileEditorHeader, { MENU_ICON_PROPS } from '@components/FileEditor/Header';
import Flex from '@oracle/components/Flex';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { addClassNames, removeClassNames } from '@utils/elements';
import useAutoScroll from '@components/CodeEditor/useAutoScroll';
import { DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET, TIME_FORMAT, momentInLocalTimezone, utcStringToElapsedTime } from '@utils/date';
import { KeyValueType } from '@interfaces/CommandCenterType';
import { getApplicationColors } from '@components/ApplicationManager/index.style';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelHeader from '@components/Kernels/Header';
import KernelOutputType, { ExecutionStateEnum, ExecutionStatusEnum, EXECUTION_STATE_DISPLAY_LABEL_MAPPING, EXECUTION_STATUS_DISPLAY_LABEL_MAPPING, MsgType, GroupOfOutputsType } from '@interfaces/KernelOutputType';
import Spacing from '@oracle/elements/Spacing';
import StatusFooter from '@components/PipelineDetail/StatusFooter';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import TripleLayout from '@components/TripleLayout';
import useApplicationBase, { ApplicationBaseType } from '../useApplicationBase';
import useInteractiveCodeOutput from '@components/InteractiveCodeOutput/useInteractiveCodeOutput';
import useTripleLayout from '@components/TripleLayout/useTripleLayout';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { BlockLanguageEnum } from '@interfaces/BlockType';
import { ContainerStyle } from '../index.style';
import { DISPLAY_LABEL_MAPPING, WebSocketStateEnum } from '@interfaces/WebSocketType';
import { KEY_CODE_ENTER, KEY_CODE_META, KEY_SYMBOL_ENTER, KEY_SYMBOL_M, KEY_SYMBOL_META } from '@utils/hooks/keyboardShortcuts/constants';
import { CircleWithArrowUp, CubeWithArrowDown, PlayButtonFilled, PowerOnOffButton, Terminal as TerminalIcon, PauseV2, Callback, ArrowLeft, ChevronLeft } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { executeCode } from '@components/CodeEditor/keyboard_shortcuts/shortcuts';
import { getCodeCached, setCodeCached } from './utils';
import { getInteractionsCache, setInteractionsCache, getItemsCached, setItemsCached } from './storage';
import { keysPresentAndKeysRecent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { useKeyboardContext } from '@context/Keyboard';
import { useModal } from '@context/Modal';
import { selectKeys } from '@utils/hash';
import { getApplications } from '@storage/ApplicationManager/cache';

const CURRENT_EXECUTION_STATE_ID = 'CURRENT_EXECUTION_STATE_ID';

function CodeMatrix({
  query,
  ...props
}: ApplicationBaseType & {
   query?: {
    file_path: string;
  };
}) {
  const timeoutRef = useRef(null);
  const displayLocalTimezone = shouldDisplayLocalTimezone();

  const editorRef = useRef(null);
  const editorKeyMappingRef = useRef({});

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
  const kernelStatusCheckedAtTimestampRef = useRef(null);
  const kernelStatusTimeoutRef = useRef(null);

  const [activeGroup, setActiveGroup] = useState<GroupOfOutputsType>(false);
  const [running, setRunning] = useState(false);
  const [selectedGroupOfOutputs, setSelectedGroupOfOutputs] = useState(false);
  const [language, setLanguage] = useState(BlockLanguageEnum.PYTHON);
  const [open, setOpen] = useState(false);
  const [pause, setPause] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(true);

  const [mounted, setMounted] = useState(false);

  const monaco = useMonaco();

  const onMountCallback = useCallback((editor) => {
    editorRef.current = editor;
    setMounted(true);
  }, []);

  function getCodeFromEditor(): string {
    const highlightedText = editorRef?.current?.getModel().getValueInRange(
      editorRef?.current?.getSelection(),
    );
    const text = editorRef?.current?.getValue();
    const message = highlightedText || text || contentRef?.current;
    return message;
  }

  useEffect(() => {
    if (mounted && monaco) {
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

      [
        {
          id: `${ApplicationExpansionUUIDEnum.CodeMatrix}/run-code`,
          label: 'Run code',
          keybindings: [
            // metaKey
            // 3
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
          ],
          run: () => {
            sendMessage();
          },
        },
        {
          id: `${ApplicationExpansionUUIDEnum.CodeMatrix}/output-scroll-bttom-all`,
          label: 'Teleport to the bottom of the outputs',
          keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK,
          ],
          run: () => {
            scrollOutputTo({ bottom: true });
          },
        },
        {
          id: `${ApplicationExpansionUUIDEnum.CodeMatrix}/output-scroll-top-all`,
          label: 'Teleport to the top of the outputs',
          keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ,
          ],
          run: () => {
            scrollOutputTo({ top: true });
          },
        },
      ].forEach((shortcut) => {
        editorRef.current.addAction({
          ...shortcut,
          keybindingContext: null,
          precondition: null,
        });
      });
    }
  }, [monaco, mounted]);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
      clearTimeout(kernelStatusTimeoutRef.current);
    };
  }, []);

  const shouldReconnect = useCallback(() => {
    return true;
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
    rowsAfter,
    setHiddenAfter,
    setHiddenBefore,
    setMousedownActiveAfter,
    setMousedownActiveBefore,
    setRowsAfter,
    setWidthAfter,
    setWidthBefore,
    widthAfter,
    widthBefore,
  } = useTripleLayout(ApplicationExpansionUUIDEnum.CodeMatrix, {
    hiddenAfter: false,
    hiddenBefore: true,
  });

  useEffect(() => {
    if (afterInnerRef?.current) {
      const val = getInteractionsCache()?.scrollTop;
      scrollOutputTo({
        bottom: typeof val !== 'undefined' ? Number(val) : true,
      });

      const handleScroll = (e) => {
        setInteractionsCache({
          scrollTop: e?.target?.scrollTop,
        });
      };

      afterInnerRef?.current?.addEventListener('scroll', handleScroll);

      return () => afterInnerRef?.current?.removeEventListener('scroll', handleScroll);
    }
  }, []);

  function updateKernelStatusCheck() {
    if (!kernelStatusTimeoutRef?.current
      || !kernelStatusCheckResultsTextRef?.current
      || !kernelStatusCheckedAtTimestampRef?.current
    ) {
      return;
    }

    kernelStatusTimeoutRef.current = setTimeout(() => {
      const datetime = momentInLocalTimezone(
        tzMoment(kernelStatusCheckedAtTimestampRef?.current),
        displayLocalTimezone,
      ).format(DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET);

      if (kernelStatusCheckResultsTextRef?.current) {
        kernelStatusCheckResultsTextRef.current.innerText =
          `Kernel checked ${utcStringToElapsedTime(datetime, true)}`;
      }

      updateKernelStatusCheck();
    }, 1000);
  }

  const onMessage = useCallback((output: KernelOutputType, {
    executionState,
    executionStatus,
  }) => {
    timeoutRef.current = setTimeout(() => {
      setRunning(false);
    }, 3000);

    if (MsgType.SHUTDOWN_REQUEST === output?.msg_type) {
      return;
    }

    if (output?.parent_message?.msg_type === MsgType.USAGE_REQUEST) {
      kernelStatusCheckedAtTimestampRef.current = output?.execution_metadata?.date;
      kernelStatusTimeoutRef.current = setTimeout(() => updateKernelStatusCheck(), 1);
      return;
    }

    executionStateRef.current = executionState;
    executionStatusRef.current = executionStatus;
    renderStatusAndState(output);
    setItemsCached([output], false);
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
          <Text default monospace noWrapping xsmall>
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
          <Text default monospace noWrapping xsmall>
            {EXECUTION_STATE_DISPLAY_LABEL_MAPPING[output?.execution_state]}
          </Text>
        </div>
      );
    }
  }

  function onRenderOutputCallback() {
  }

  function onActiveateGroupOfOutputs(group?: GroupOfOutputsType): void {
    setActiveGroup(group);
  }

  function onDeactivateGroupOfOutputs(group?: GroupOfOutputsType): void {
    setActiveGroup(null);
  }

  const {
    clearOutputs,
    connectionState,
    deactivateGroup,
    kernel,
    kernelStatusCheckResults,
    interruptKernel,
    output,
    outputFocused,
    scrollOutputTo,
    sendMessage: sendMessageInit,
  } = useInteractiveCodeOutput({
    checkKernelStatus: true,
    containerRef: afterInnerRef,
    onActiveateGroupOfOutputs,
    onDeactivateGroupOfOutputs,
    getDefaultMessages: () => getItemsCached(),
    onMessage,
    onOpen: setOpen,
    onRenderOutputCallback,
    shouldConnect,
    shouldReconnect,
    uuid: `code/${ApplicationExpansionUUIDEnum.CodeMatrix}`,
  });

  function stopExecution() {
    interruptKernel();
    setRunning(false);
  }

  sendMessageRef.current = sendMessageInit;
  function sendMessage(payload?: KeyValueType): void {
    sendMessageRef?.current?.({
      ...payload,
      message: getCodeFromEditor(),
    });
    setRunning(true);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setRunning(false), 3000);
  }

  const fileEditor = useMemo(() => {
    return (
      <FileEditor
        active
        file={{
          content: (getCodeCached(language) || '') as string,
          uuid: ApplicationExpansionUUIDEnum.CodeMatrix,
          name: ApplicationExpansionUUIDEnum.CodeMatrix,
          language,
        }}
        contained
        containerRef={mainContainerRef}
        disableRefreshWarning
        hideHeaderButtons
        onContentChange={(content: string) => {
          contentRef.current = content;
          setCodeCached(language, content);
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
            uuid: 'Execute code',
            onClick: () => sendMessage(),
          },
          {
            beforeIcon: <TerminalIcon {...MENU_ICON_PROPS} />,
            uuid: 'Stop execution',
            onClick: () => stopExecution(),
          },
        ],
      },
    ];
  }, []);

  const mainContentHeaderMemo = useMemo(() => (
    <FlexContainer alignItems="center" justifyContent="space-between">
      <Flex flex={1}>
        <FileEditorHeader menuGroups={menuGroups} />

        <Spacing ml={1} id="CodeMatrix-RunButton">
          <FlexContainer alignItems="center">
            <Button
              beforeIcon={running
                ? (
                  <Loading
                    color={getApplicationColors(ApplicationExpansionUUIDEnum.CodeMatrix)?.accent}
                    colorLight={getApplicationColors(ApplicationExpansionUUIDEnum.CodeMatrix)?.accentLight}
                    loadingStyle={LoadingStyleEnum.BLOCKS}
                    width={1 * UNIT}
                  />
                )
                : <PlayButtonFilled success />
              }
              compact
              disabled={running}
              small
              ref={runButtonRef}
              onClick={() => {
                sendMessage();
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
        </Spacing>

        <Spacing ml={1} id="CodeMatrix-RunButton">
          <Button
            disabled={!running}
            beforeIcon={<PauseV2 warning />}
            compact
            small
            onClick={() => {
              stopExecution();
            }}
          >
            Stop execution
          </Button>
        </Spacing>

        <Spacing ml={1} id="CodeMatrix-RunButton">
          <Button
            beforeIcon={<Callback default />}
            compact
            small
            secondary
            onClick={() => {
              clearOutputs();
              setItemsCached([], true);
            }}
          >
            Clear outputs
          </Button>
        </Spacing>
      </Flex>

      <FlexContainer justifyContent="flex-end" id={CURRENT_EXECUTION_STATE_ID} />

      <Spacing mr={1} />
    </FlexContainer>
  ), [
    connectionState,
    kernelStatusCheckResults,
    open,
    running,
    shouldConnect,
  ]);

  const uuidKeyboard = ApplicationExpansionUUIDEnum.CodeMatrix;
  const { registerOnKeyDown, unregisterOnKeyDown } = useKeyboardContext();
  useEffect(() => () => unregisterOnKeyDown(uuidKeyboard), []);
  registerOnKeyDown(uuidKeyboard, (event, keyMapping, keyHistory) => {
  }, []);

  const afterHeaderMemo = useMemo(() => {
    const items = [
      <Spacing ml={1}>
        <KernelHeader
          compact
          fixed
          outputs={kernelStatusCheckResults}
          refreshInterval={0}
          revalidateOnFocus={false}
        />
      </Spacing>,
      <Spacing ml={1}>
        <Tooltip
          block
          label={(
            <>
              {!shouldConnect && (
                <Text warning small>
                  Turn on the WebSocket connection before coding
                </Text>
              )}
              {shouldConnect && (
                <Text warning={!open} small success={open}>
                  {open ? 'Ready' : 'WebSocket connection isn’t open yet'}
                </Text>
              )}
            </>
          )}
          fixed
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
            small
            secondary
          >
            <Text monospace noWrapping small>
              WebSocket {DISPLAY_LABEL_MAPPING[connectionState]?.toLowerCase()}
            </Text>
          </Button>
        </Tooltip>
      </Spacing>,
    ];

    items.push(...[
      <Spacing ml={1}>
        <ButtonGroup>
          <Button
            beforeIcon={<CircleWithArrowUp active />}
            compact
            small
            secondary
            onClick={() => {
              scrollOutputTo({ top: true });
            }}
          >
            Teleport top
          </Button>
          <Button
            beforeIcon={<CubeWithArrowDown active />}
            compact
            small
            secondary
            onClick={() => {
              scrollOutputTo({ bottom: true });
            }}
          >
            Portal down
          </Button>
        </ButtonGroup>
      </Spacing>,
    ]);

    if (activeGroup) {
      items.unshift(
        <Spacing ml={1}>
          <Button
            beforeIcon={<ChevronLeft inverted />}
            compact
            small
            warning
            onClick={() => {
              deactivateGroup();
            }}
          >
            Exit output group
          </Button>
        </Spacing>,
      );
    }

    return (
      <FileTabsScroller
        fileTabs={[items]}
      />
    );
  }, [activeGroup, open, running, shouldConnect]);

  return (
    <ContainerStyle>
      <TripleLayout
        after={[
          output,
          outputFocused,
        ]}
        afterCombinedWithMain
        afterDark
        afterDividerContrast
        afterHeader={afterHeaderMemo}
        afterHeightOffset={0}
        afterHidden={hiddenAfter}
        afterInnerRef={afterInnerRef}
        afterMousedownActive={mousedownActiveAfter}
        afterRows={rowsAfter}
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
        mainContainerFooter={(
          <StatusFooter
            inline
            refreshInterval={0}
            revalidateOnFocus={false}
          >
            <FlexContainer alignItems="center">
              <Text default monospace noWrapping xsmall ref={kernelStatusCheckResultsTextRef} />
              {/*<Flex flexDirection="column" id="CodeMatrix-StatusState" />*/}
            </FlexContainer>
          </StatusFooter>
        )}
        mainContainerHeader={(
          <div
            style={{
              position: 'relative',
              zIndex: 3,
            }}
          >
            <Spacing py={1}>
              {mainContentHeaderMemo}
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
