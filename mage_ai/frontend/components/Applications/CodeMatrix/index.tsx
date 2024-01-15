import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Button from '@oracle/elements/Button';
import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Divider from '@oracle/elements/Divider';
import FileEditor from '@components/FileEditor';
import FileEditorHeader, { MENU_ICON_PROPS } from '@components/FileEditor/Header';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KernelOutputType from '@interfaces/KernelOutputType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import TripleLayout from '@components/TripleLayout';
import useApplicationBase, { ApplicationBaseType } from '../useApplicationBase';
import useInteractiveCodeOutput from '@components/InteractiveCodeOutput/useInteractiveCodeOutput';
import useTripleLayout from '@components/TripleLayout/useTripleLayout';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { BlockLanguageEnum } from '@interfaces/BlockType';
import { ContainerStyle } from '../index.style';
import { DISPLAY_LABEL_MAPPING } from '@interfaces/WebSocketType';
import { KEY_CODE_ENTER, KEY_CODE_META } from '@utils/hooks/keyboardShortcuts/constants';
import { PowerOnOffButton, Terminal as TerminalIcon } from '@oracle/icons';
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
  const contentRef = useRef(null);
  const sendMessageRef = useRef(null);

  const [language, setLanguage] = useState(BlockLanguageEnum.PYTHON);
  const [open, setOpen] = useState(false);
  const [pause, setPause] = useState(false);
  const [ready, setReady] = useState(false);
  const [shouldConnect, setShouldConnect] = useState(false);

  const shouldReconnect = useCallback(() => {
    return open && !pause && ready && shouldConnect;
  }, [open, pause, ready, shouldConnect]);

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

  const onMessage = useCallback((message: KernelOutputType) => {
    setItems([message], false);
  }, []);

  const {
    connectionState,
    output,
    sendMessage,
    shell,
  } = useInteractiveCodeOutput({
    messagesDefault: getItems(),
    onMessage,
    onOpen: setOpen,
    shouldConnect,
    shouldReconnect,
    uuid: `code/${ApplicationExpansionUUIDEnum.CodeMatrix}`,
  });

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
      </Flex>

      <Flex alignItems="center">
        <Tooltip
          appearBefore
          block
          label={`WebSocket readiness state: ${DISPLAY_LABEL_MAPPING[connectionState]?.toLowerCase()}`}
          size={null}
          visibleDelay={300}
          widthFitContent
        >
          <Button
            iconOnly
            noBackground
            noBorder
            noPadding
            onClick={() => setShouldConnect(prev => !prev)}
          >
            <PowerOnOffButton
              danger={!(open && ready && shouldConnect)}
              size={2 * UNIT}
              success={open && ready && shouldConnect}
            />
          </Button>
        </Tooltip>
      </Flex>

      <Spacing mr={1} />
    </FlexContainer>
  ), [
    connectionState,
    menuGroups,
    open,
    ready,
    shouldConnect,
  ]);

  const uuidKeyboard = ApplicationExpansionUUIDEnum.CodeMatrix;
  const { registerOnKeyDown, registerOnKeyUp, unregisterOnKeyDown, unregisterOnKeyUp } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
    unregisterOnKeyUp(uuidKeyboard);
  }, [unregisterOnKeyDown, unregisterOnKeyUp, uuidKeyboard]);

  registerOnKeyUp(uuidKeyboard, (event, keyMapping, keyHistory) => {
    console.log(keyMapping, keyHistory)

    // if (keyMapping[KEY_CODE_META]) {
    //   console.log('Pausing event');
    //   event.preventDefault();
    //   setPause(true);
    // }

    if (keysPresentAndKeysRecent([KEY_CODE_ENTER], [KEY_CODE_META], keyMapping, keyHistory, {
      lookback: 2,
    })) {
      console.log('Running code from CodeMatrix keyboard shortcuts.');
      sendMessage({
        message: contentRef.current,
      });
    }
  }, []);

  return (
    <ContainerStyle>
      <TripleLayout
        after={(
          <div>
            {output}
            {shell}
          </div>
        )}
        afterCombinedWithMain
        afterDividerContrast
        afterHeightOffset={0}
        // afterHidden={hiddenAfter}
        afterMousedownActive={mousedownActiveAfter}
        afterWidth={widthAfter}
        autoLayout
        // before={FileBrowserTabEnum.GROUPED_BY_TYPE === selectedTab?.uuid ? browserFlatten : browser}
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
        // mainContainerFooter={footer}
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
