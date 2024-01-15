import tzMoment from 'moment-timezone';
import { createRoot } from 'react-dom/client';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import dark from '@oracle/styles/themes/dark';
import { ThemeContext } from 'styled-components';
import { ThemeProvider } from 'styled-components'
import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Divider from '@oracle/elements/Divider';
import FileEditor from '@components/FileEditor';
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
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { BlockLanguageEnum } from '@interfaces/BlockType';
import { ContainerStyle } from '../index.style';
import { DISPLAY_LABEL_MAPPING, WebSocketStateEnum } from '@interfaces/WebSocketType';
import { KEY_CODE_ENTER, KEY_CODE_META } from '@utils/hooks/keyboardShortcuts/constants';
import { PlayButtonFilled, PowerOnOffButton, Terminal as TerminalIcon } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { executeCode } from '@components/CodeEditor/keyboard_shortcuts/shortcuts';
import { getCode, setCode } from './utils';
import { getItems, setItems } from './storage';
import { keysPresentAndKeysRecent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';
import { useKeyboardContext } from '@context/Keyboard';
import { useModal } from '@context/Modal';

function CodeMatrix({
  query,
  ...props
}: ApplicationBaseType & {
   query?: {
    file_path: string;
  };
}) {
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const themeContext = useContext(ThemeContext);

  const statusStateRootRef = useRef(null);
  const runButtonRootRef = useRef(null)
  const runButtonRef = useRef(null)
  const executionStateRef = useRef(null);
  const executionStatusRef = useRef(null);

  const contentRef = useRef(null);
  const onOpenCallbackRef= useRef(null);
  const sendMessageRef = useRef(null);
  const kernelStatusCheckResultsTextRef = useRef(null);

  const [language, setLanguage] = useState(BlockLanguageEnum.PYTHON);
  const [openState, setOpen] = useState(false);
  const [pause, setPause] = useState(false);
  const [ready, setReady] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);

  const shouldReconnect = useCallback(() => {
    return openState && !pause && shouldConnect;
  }, [openState, pause, shouldConnect]);

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
    if (output?.parent_message?.msg_type === MsgType.USAGE_REQUEST) {
      const datetime = momentInLocalTimezone(
        tzMoment(output?.[0]?.execution_metadata?.date),
        displayLocalTimezone,
      ).format(DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET);

      if (kernelStatusCheckResultsTextRef?.current) {
        kernelStatusCheckResultsTextRef.current.innerText = `Last checked ${utcStringToElapsedTime(datetime, true)}`;
      }
    } else {
      setItems([output], false);
    }

    executionStateRef.current = executionState;
    executionStatusRef.current = executionStatus;

    if (!statusStateRootRef?.current) {
      const domNode = document.getElementById('CodeMatrix-StatusState');
      if (domNode) {
        statusStateRootRef.current = createRoot(domNode);
      }
    }

    if (!runButtonRootRef?.current) {
      const domNode = document.getElementById('CodeMatrix-RunButton');
      if (domNode) {
        runButtonRootRef.current = createRoot(domNode);
      }
    }

    if (statusStateRootRef?.current) {
      statusStateRootRef?.current?.render(
        <div>
          <Text default monospace xsmall>
            {EXECUTION_STATE_DISPLAY_LABEL_MAPPING[executionState]}
          </Text>
          <Text default monospace xsmall>
            Recent run status: <Text
              danger={ExecutionStatusEnum.FAILED === executionStatus}
              default={ExecutionStatusEnum.CANCELLED === executionStatus}
              inline
              monospace
              muted={ExecutionStatusEnum.PENDING === executionStatus}
              success={ExecutionStatusEnum.SUCCESS === executionStatus}
              warning={ExecutionStatusEnum.EMPTY_RESULTS === executionStatus || ExecutionStatusEnum.CANCELLED === executionStatus}
              xsmall
            >
              {EXECUTION_STATUS_DISPLAY_LABEL_MAPPING[executionStatus]?.toLowerCase()}
            </Text>
          </Text>
        </div>
      );
    }

    if (runButtonRootRef?.current) {
      runButtonRootRef?.current?.render(
        <ThemeProvider theme={themeContext}>
          <Button
            beforeIcon={<PlayButtonFilled success />}
            secondary
            compact
            small
            loading={executionStateRef.current === ExecutionStateEnum.BUSY || executionStatusRef.current === ExecutionStatusEnum.RUNNING}
            onClick={() => {
              sendMessage({
                message: contentRef.current,
              });
            }}
          >
            Execute code
          </Button>
        </ThemeProvider>
      );
    }
  }, []);

  const {
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
    shouldConnect,
    shouldReconnect,
    uuid: `code/${ApplicationExpansionUUIDEnum.CodeMatrix}`,
  });

  const open = useMemo(() => openState && WebSocketStateEnum.OPEN === connectionState, [
    connectionState,
    openState,
  ]);

  const shortcuts = useMemo(() => {
    return [
      (monaco, _editor) => {
        return {
          id: `${ApplicationExpansionUUIDEnum.CodeMatrix}/run-code`,
          keybindingContext: null,
          keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
          ],
          label: 'Run code',
          precondition: null,
          run: (editor) => {
            const highlightedText = editor.getModel().getValueInRange(editor.getSelection());
            const text = editor.getValue();
            const message = highlightedText || text;

            sendMessage?.({
              message,
            });
          },
        };
      },
    ];
  }, [open, ready, sendMessage]);

  const fileEditor = useMemo(() => {
    return (
      <FileEditor
        active={!pause}
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
        onMountCallback={() => {
          setReady(true);
        }}
        saveFile={() => false}
        shortcuts={shortcuts}
      />
    );
  }, [language, pause, shortcuts]);

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
    </FlexContainer>
  ), [
    connectionState,
    kernelStatusCheckResults,
    menuGroups,
    open,
    shouldConnect,
  ]);

  const uuidKeyboard = ApplicationExpansionUUIDEnum.CodeMatrix;
  const { registerOnKeyDown, registerOnKeyUp, unregisterOnKeyDown, unregisterOnKeyUp } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
    unregisterOnKeyUp(uuidKeyboard);
  }, [unregisterOnKeyDown, unregisterOnKeyUp, uuidKeyboard]);

  registerOnKeyUp(uuidKeyboard, (event, keyMapping, keyHistory) => {

    // if (keyMapping[KEY_CODE_META]) {
    //   console.log('Pausing event');
    //   event.preventDefault();
    //   setPause(true);
    // }

    if (keysPresentAndKeysRecent([KEY_CODE_ENTER], [KEY_CODE_META], keyMapping, keyHistory, {
      lookback: 2,
    })) {
      console.log('Running code from CodeMatrix keyboard shortcuts.');
      if (shouldConnect) {
        sendMessage({
          message: contentRef.current,
        });
      } else {
        onOpenCallbackRef.current = () => {
          sendMessage({
            message: contentRef.current,
          });
        };
        setShouldConnect(true);
      }
    }
  }, []);

  const footer = useMemo(() => {
    return (
      <StatusFooter
        inline
        refreshInterval={0}
        revalidateOnFocus={false}
      />
    );
  }, [
  ]);

  const afterOutput = useMemo(() => (
    <div>
      {output}
      {shell}
      <div style={{ height: mainContainerRef?.current?.getBoundingClientRect()?.height }} />
    </div>
  ), [
    connectionState,
    open,
    output,
    shell,
    shouldConnect,
  ]);

  const afterHeaderMemo = useMemo(() => {
    return (
      <>
        <Flex flexDirection="column" id="CodeMatrix-StatusState" />

        <Flex flex={1} alignItems="center" justifyContent="flex-end">
          <Spacing mx={1} id="CodeMatrix-RunButton">
            <Button
              beforeIcon={<PlayButtonFilled success />}
              secondary
              compact
              small
              ref={runButtonRef}
              loading={executionStateRef.current === ExecutionStateEnum.BUSY || executionStatusRef.current === ExecutionStatusEnum.RUNNING}
              onClick={() => {
                if (!open || !shouldConnect) {
                  onOpenCallbackRef.current = () => {
                    sendMessage({
                      message: contentRef.current,
                    });
                  };
                  setShouldConnect(true);
                } else {
                  sendMessage({
                    message: contentRef.current,
                  });
                }
              }}
            >
              Execute code
            </Button>
          </Spacing>
        </Flex>
      </>
    );
  }, [open, shouldConnect, sendMessage]);

  return (
    <ContainerStyle>
      <TripleLayout
        after={afterOutput}
        afterCombinedWithMain
        afterDividerContrast
        afterHeader={afterHeaderMemo}
        afterHeightOffset={0}
        afterHidden={hiddenAfter}
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
