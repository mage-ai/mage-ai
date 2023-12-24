import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import AutocompleteDropdown from '@components/AutocompleteDropdown';
import CodeEditor from '@components/CodeEditor';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import TextInput from '@oracle/elements/Inputs/TextInput';
import api from '@api';
import { AISparkle, PanelCollapseRight } from '@oracle/icons';
import { BORDER_WIDTH_THICK } from '@oracle/styles/units/borders';
import {
  ButtonStyle,
  CloseStyle,
  EditorWrapperStyle,
  ICON_SIZE,
  InputStyle,
  TextInputFocusAreaStyle,
} from './index.style';
import { CodeBlockEditorProps } from '../constants';
import { DropdownStyle, RowStyle, SearchStyle } from '@components/PipelineDetail/AddNewBlocks/v2/index.style';
import { ItemType, RenderItemProps } from '@components/AutocompleteDropdown/constants';
import {
  KEY_CODE_CONTROL,
  KEY_CODE_ENTER,
  KEY_CODE_ESCAPE,
  KEY_CODE_PERIOD,
  KEY_SYMBOL_CONTROL,
  KEY_SYMBOL_PERIOD,
} from '@utils/hooks/keyboardShortcuts/constants';
import { LEFT_PADDING } from '@components/CodeBlock/index.style';
import { LLMUseCaseEnum } from '@interfaces/LLMType';
import { LOCAL_STORAGE_KEY_GENERATE_CODE_HISTORY, get, set } from '@storage/localStorage';
import { UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { useError } from '@context/Error';
import { useKeyboardContext } from '@context/Keyboard';
import { useWindowSize } from '@utils/sizes';

const WIDTH_OFFSET = ((BORDER_WIDTH_THICK * 2) + (UNIT * 2) + LEFT_PADDING);

function Editor({
  autocompleteProviders,
  block,
  blockRef,
  content,
  height,
  onChange,
  onContentSizeChangeCallback,
  onDidChangeCursorPosition,
  onMountCallback,
  placeholder,
  selected,
  setSelected,
  setTextareaFocused,
  shortcuts,
  textareaFocused,
  theme,
}: CodeBlockEditorProps) {
  const { width } = useWindowSize();

  const componentUUID = `CodeBlockEditorV2/${block?.uuid}/editor/button/AI`;
  const [showError] = useError(null, {}, [], {
    uuid: componentUUID,
  });

  const [focused, setFocused] = useState<boolean>(false);

  const history = get(LOCAL_STORAGE_KEY_GENERATE_CODE_HISTORY, []);

  const refButton = useRef(null);
  const refEditor = useRef(null);
  const refEditorContainer = useRef(null);
  const refEditorLineNumber = useRef(null);
  const refInput = useRef(null);
  const refInputValue = useRef(null);
  const refInputContainer = useRef(null);

  const {
    color: blockColor,
    language,
    type,
  } = block;

  const color = getColorsForBlockType(type, {
    blockColor,
    theme,
  });

  const reset = useCallback(() => {
    refButton.current.style.opacity = 1;
    refInputContainer.current.style.display = 'none';
    refEditor.current.focus();
  }, []);

  const start = useCallback(() => {
    refButton.current.style.opacity = 0;
    refInputContainer.current.style.display = 'block';
    setTimeout(() => refInput?.current?.focus?.(), 1);
  }, []);

  const generateCode = useCallback(() => {
    createCode({
      llm: {
        request: {
          block_description: refInputValue.current,
          code_language: language,
        },
        use_case: LLMUseCaseEnum.GENERATE_CODE,
      },
    });
  });

  const updateContentWithCode = useCallback((code: string) => {
    const parts = content?.split('\n') || [];
    const lineNumber = refEditorLineNumber?.current;
    const part1 = parts?.slice(0, lineNumber - 1);
    const part2 = parts?.slice(lineNumber, parts?.length);
    // @ts-ignore
    const combined = part1.concat([code, '']).concat(part2).join('\n');

    setTimeout(() => refEditor.current.focus(), 1);
    setTimeout(() => {
      refEditor?.current?.setPosition({
        column: 1,
        lineNumber: lineNumber + 1,
      });
    }, 2);

    onChange(combined);
  }, [
    content,
  ]);

  const [createCode, { isLoading: isLoadingCreateCode }] = useMutation(
    api.llms.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            llm,
          }) => {
            let code;
            if (typeof llm?.response === 'string') {
              code = llm?.response;
            } else {
              code = llm?.response?.code;
            }

            set(LOCAL_STORAGE_KEY_GENERATE_CODE_HISTORY, [
              {
                block: {
                  uuid: block?.uuid,
                },
                code,
                description: refInputValue.current,
                language,
                timestamp: Number(new Date()),
              },
              // @ts-ignore
            ].concat((history && Array.isArray(history)) ? history : [])?.slice(0, 40));

            updateContentWithCode(code);

            refInput.current.value = '';
            refInput.current.blur();
            refInputValue.current = '';

            setSelected(true);
            setTextareaFocused(true);
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const focusArea = useMemo(() => (
    <TextInputFocusAreaStyle
      onClick={() => refInput?.current?.focus()}
    />
  ), []);

  const autocompleteItems: ItemType[] = useMemo(() => {
    const arr = [];

    history?.forEach((itemObject) => {
      arr.push({
        itemObject,
        searchQueries: [
          itemObject?.block?.uuid,
          itemObject?.code,
          itemObject?.description,
          itemObject?.language
        ],
        value: `${itemObject?.description}/${itemObject?.timestamp}`,
      });
    });

    return arr;
  }, [history]);

  const inputMemo = useMemo(() => (
    <InputStyle color={color?.accent} ref={refInputContainer}>
      <CloseStyle>
        <KeyboardShortcutButton
          noBackground
          noBorder
          noPadding
          onClick={(e) => {
            pauseEvent(e);
            reset();
          }}
        >
          <PanelCollapseRight default size={ICON_SIZE} />
        </KeyboardShortcutButton>
      </CloseStyle>

      {focusArea}

      <TextInput
        beforeIcon={(
          <KeyboardTextGroup
            addPlusSignBetweenKeys
            keyTextGroups={[[KEY_SYMBOL_CONTROL, KEY_SYMBOL_PERIOD]]}
          />
        )}
        buttonAfter={(
          <KeyboardShortcutButton
            backgroundColor={color?.accent}
            bold
            loading={isLoadingCreateCode}
            noBorder
            onClick={(e) => {
              pauseEvent(e);
              generateCode();
            }}
            pill
          >
            Generate code
          </KeyboardShortcutButton>
        )}
        fullWidth
        monospace
        noBackground
        noBorder
        noBorderRadiusBottom
        noBorderRadiusTop
        onKeyDown={(e) => {
          if (KEY_CODE_ESCAPE === e.keyCode) {
            pauseEvent(e);
            reset();
          } else if (KEY_CODE_ENTER === e.keyCode) {
            pauseEvent(e);
            generateCode();
          }
        }}
        // onBlur={() => setTimeout(() => setFocused(false), 150)}
        onChange={(e) => {
          refInputValue.current = e.target.value;
        }}
        onFocus={() => setFocused(true)}
        paddingLeft={UNIT * 10}
        paddingRight={UNIT * 16}
        paddingVertical={UNIT * 1.5}
        placeholder="e.g. Read files from disk asynchronously"
        ref={refInput}
      />

      {focusArea}

      <DropdownStyle
        maxHeight={UNIT * 100}
        topOffset={refInputContainer?.current?.getBoundingClientRect().height}
        width={`${refInputContainer?.current?.getBoundingClientRect().width - (UNIT * 3)}px`}
      >
        <AutocompleteDropdown
          itemGroups={[
            {
              items: focused ? autocompleteItems : [],
              renderItem: (
                {
                  itemObject,
                }: ItemType,
                opts: RenderItemProps,
              ) => {
                return (
                  <RowStyle
                    {...opts}
                    onClick={(e) => {
                      pauseEvent(e);
                      opts?.onClick?.(e);
                    }}
                  >
                    <Flex
                      alignItems="center"
                      flex={1}
                      justifyContent="space-between"
                    >
                      <FlexContainer alignItems="center" flex={1}>
                        <Text default monospace small>
                          {itemObject?.code}
                        </Text>
                      </FlexContainer>

                      <FlexContainer alignItems="center">
                        <Spacing mr={1} />

                        <Text monospace muted xsmall>
                          {itemObject?.description}
                        </Text>
                      </FlexContainer>
                    </Flex>
                  </RowStyle>
                );
              },
            },
          ]}
          maxResults={12}
          onSelectItem={({
            itemObject,
          }: ItemType) => {
            updateContentWithCode(itemObject?.code);
          }}
          searchQuery={refInputValue.current}
          uuid={`${componentUUID}/AutocompleteDropdown`}
        />
      </DropdownStyle>
    </InputStyle>
  ), [
    autocompleteItems,
    color,
    createCode,
    focused,
    isLoadingCreateCode,
    language,
  ]);

  const editor = useMemo(() => (
    <CodeEditor
      autoHeight
      autocompleteProviders={autocompleteProviders}
      block={block}
      blockRef={blockRef}
      editorRef={refEditor}
      height={height}
      language={language}
      onChange={(val: string) => {
        onChange?.(val);
      }}
      onContentSizeChangeCallback={onContentSizeChangeCallback}
      onDidChangeCursorPosition={(opts) => {
        if (onDidChangeCursorPosition) {
          onDidChangeCursorPosition?.(opts);
        }

        const editor = opts?.editor;
        const lineNumber = opts?.position?.lineNumber;
        refEditorLineNumber.current = lineNumber;

        const editorHeight = editor?.getContentHeight();
        const linesCount = editor?.getModel()?.getLineCount();
        const lineHeight = editorHeight / linesCount;

        const top = lineNumber * lineHeight;

        refButton.current.style.top = `${(top - lineHeight) - (ICON_SIZE / 4)}px`;
        refInputContainer.current.style.top = `${top}px`;

        const width = (refEditorContainer?.current?.getBoundingClientRect?.()?.width || 0) - WIDTH_OFFSET;
        refInputContainer.current.style.width = `${width}px`;
      }}
      onMountCallback={(editor, monaco) => {
        if (onMountCallback) {
          onMountCallback?.();
        }

        setTimeout(() => {
          const width = (refEditorContainer?.current?.getBoundingClientRect?.()?.width || 0)
            - WIDTH_OFFSET;
          refInputContainer.current.style.width = `${width}px`;
        }, 1);
      }}
      placeholder={placeholder}
      ref={refEditorContainer}
      selected={selected}
      setSelected={setSelected}
      setTextareaFocused={setTextareaFocused}
      shortcuts={shortcuts}
      textareaFocused={textareaFocused}
      value={content}
      width="100%"
    />
  ), [
    autocompleteProviders,
    block,
    blockRef,
    content,
    height,
    language,
    onChange,
    onContentSizeChangeCallback,
    onDidChangeCursorPosition,
    onMountCallback,
    placeholder,
    selected,
    setSelected,
    setTextareaFocused,
    shortcuts,
    textareaFocused,
  ]);

  const {
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(componentUUID);
  }, [unregisterOnKeyDown, componentUUID]);

  registerOnKeyDown(
    componentUUID,
    (event, keyMapping, keyHistory) => {
      if (selected && onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_PERIOD], keyMapping)) {
        start();
      }
    },
    [
      selected,
    ],
  );

  useEffect(() => {
    setTimeout(() => {
      const width = (refEditorContainer?.current?.getBoundingClientRect?.()?.width || 0)
        - WIDTH_OFFSET;
      refInputContainer.current.style.width = `${width}px`;
    }, 1);
  }, [width]);

  return (
    <EditorWrapperStyle>
      <ButtonStyle ref={refButton}>
        <KeyboardShortcutButton
          noBackground
          noBorder
          noPadding
          onClick={(e) => {
            if (selected) {
              pauseEvent(e);
              start();
            }
          }}
          uuid={componentUUID}
        >
          <AISparkle size={ICON_SIZE} warning />
        </KeyboardShortcutButton>
      </ButtonStyle>

      {inputMemo}

      {editor}
    </EditorWrapperStyle>
  );
}

export default Editor;
