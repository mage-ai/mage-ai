import { useEffect, useMemo, useRef, useState } from 'react';

import ButtonTabs, { TabType } from '@oracle/components/Tabs/ButtonTabs';
import Divider from '@oracle/elements/Divider';
import FileEditor from '@components/FileEditor';
import FileEditorHeader, { MENU_ICON_PROPS } from '@components/FileEditor/Header';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import TripleLayout from '@components/TripleLayout';
import useApplicationBase, { ApplicationBaseType } from '../useApplicationBase';
import useInteractiveCodeOutput from '@components/InteractiveCodeOutput/useInteractiveCodeOutput';
import useTripleLayout from '@components/TripleLayout/useTripleLayout';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { BlockLanguageEnum } from '@interfaces/BlockType';
import { ContainerStyle } from '../index.style';
import { KEY_CODE_ENTER, KEY_CODE_META } from '@utils/hooks/keyboardShortcuts/constants';
import { Terminal as TerminalIcon } from '@oracle/icons';
import { executeCode } from '@components/CodeEditor/keyboard_shortcuts/shortcuts';
import { getCode, setCode } from './utils';
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

  const [language, setLanguage] = useState(BlockLanguageEnum.PYTHON);
  const [pause, setPause] = useState(false);
  const [ready, setReady] = useState(false);

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

  const {
    output,
    sendMessage,
    shell,
  } = useInteractiveCodeOutput({
    shouldConnect: ready,
    uuid: ApplicationExpansionUUIDEnum.CodeMatrix,
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
            console.log(highlightedText || text);
          },
        };
      },
    ];
  }, []);

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
      <Spacing mr={1} />
    </FlexContainer>
  ), [
    menuGroups,
  ]);

  // const uuidKeyboard = ApplicationExpansionUUIDEnum.CodeMatrix;
  // const { registerOnKeyDown, registerOnKeyUp, unregisterOnKeyDown, unregisterOnKeyUp } = useKeyboardContext();
  // useEffect(() => () => {
  //   unregisterOnKeyDown(uuidKeyboard);
  //   unregisterOnKeyUp(uuidKeyboard);
  // }, [unregisterOnKeyDown, unregisterOnKeyUp, uuidKeyboard]);
  // registerOnKeyDown(uuidKeyboard, (event, keyMapping, keyHistory) => {
  //   console.log('down', keyMapping, keyHistory);
  //   if (keysPresentAndKeysRecent([KEY_CODE_META], [], keyMapping, keyHistory)) {
  //     pauseEvent(event);
  //     setPause(true);
  //     console.log('BAM')
  //   }
  // }, []);
  // registerOnKeyUp(uuidKeyboard, (event, keyMapping, keyHistory) => {
  //   setPause(false);
  //   console.log('up', keyMapping, keyHistory);
  //   if (keysPresentAndKeysRecent([KEY_CODE_META], [], keyMapping, keyHistory)) {
  //     pauseEvent(event);
  //     console.log('BAM')
  //   }
  // }, []);

  return (
    <ContainerStyle>
      <TripleLayout
        after={(
          <>
            {output}
            {shell}
          </>
        )}
        afterCombinedWithMain
        afterDividerContrast
        afterHeightOffset={0}
        afterHidden={hiddenAfter}
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
