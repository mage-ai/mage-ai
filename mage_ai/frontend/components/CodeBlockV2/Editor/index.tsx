import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import AutocompleteDropdown from '@components/AutocompleteDropdown';
import ButtonGroup from '@oracle/elements/Button/ButtonGroup';
import ClickOutside from '@oracle/components/ClickOutside';
import CodeEditor from '@components/CodeEditor';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import KeyboardTextGroup from '@oracle/elements/KeyboardTextGroup';
import LLMType, { LLMUseCaseEnum } from '@interfaces/LLMType';
import Link from '@oracle/elements/Link';
import Panel from '@oracle/components/Panel';
import ProjectType from '@interfaces/ProjectType';
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
import { LOCAL_STORAGE_KEY_GENERATE_CODE_HISTORY, get, set } from '@storage/localStorage';
import { UNIT, UNITS_BETWEEN_SECTIONS } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { isDebug } from '@utils/environment';
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
  content,
  height,
  onChange,
  onContentSizeChangeCallback,
  onDidChangeCursorPosition,
  onMountCallback,
  pipeline,
  placeholder,
  project,
  selected,
  setSelected,
  setTextareaFocused,
  shortcuts,
  showConfigureProjectModal,
  textareaFocused,
  theme,
  updatePipeline,
}: CodeBlockEditorProps & {
  project: ProjectType;
  shortcuts?: ((monaco: any, editor: any) => void)[];
}) {
  if (isDebug()) {
    console.log('EditorV2 render', block?.uuid, Number(new Date()));
  }

  const { width } = useWindowSize();

  const componentUUID = `CodeBlockEditorV2/${block?.uuid}/editor/button/AI`;
  const [showError] = useError(null, {}, [], {
    uuid: componentUUID,
  });

  const [focused, setFocused] = useState<boolean>(false);
  const [showAIActions, setShowAIActions] = useState<boolean>(false);

  const history = get(LOCAL_STORAGE_KEY_GENERATE_CODE_HISTORY, []);

  const refAIActions = useRef(null);
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
    // refEditor.current.focus();
  }, []);

  const start = useCallback(() => {
    refButton.current.style.opacity = 0;
    refInputContainer.current.style.display = 'block';
    // setTimeout(() => refInput?.current?.focus?.(), 1);
  }, []);

  const updateContentWithCode = useCallback((code: string) => {
    const parts = content?.split('\n') || [];
    const lineNumber = refEditorLineNumber?.current;
    const part1 = parts?.slice(0, lineNumber - 1);
    const part2 = parts?.slice(lineNumber, parts?.length);
    // @ts-ignore
    const combined = part1.concat([code]).concat(part2).join('\n');

    // setTimeout(() => refEditor.current.focus(), 1);
    setTimeout(() => {
      refEditor?.current?.setPosition({
        column: 1,
        lineNumber,
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

            reset();
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const generateCode = useCallback(() => {
    // @ts-ignore
    createCode({
      llm: {
        request: {
          block_description: refInputValue.current,
          code_language: language,
        },
        use_case: LLMUseCaseEnum.GENERATE_CODE,
      },
    });
  }, [createCode]);

  const [createLLM, { isLoading: isLoadingCreateLLM }] = useMutation(
    api.llms.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            llm,
          }) => {

          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const itemsAIActions = useMemo(() => {
    const shouldShowModal = !project?.openai_api_key;
    const showModal = (llm: LLMType) => {
      showConfigureProjectModal?.({
        header: (
          <Spacing mb={UNITS_BETWEEN_SECTIONS}>
            <Panel>
              <Text warning>
                You need to add an OpenAI API key to your project before you can
                generate blocks using AI.
              </Text>

              <Spacing mt={1}>
                <Text warning>
                  Read <Link
                    href="https://help.openai.com/en/articles/4936850-where-do-i-find-my-secret-api-key"
                    openNewWindow
                  >
                    OpenAI’s documentation
                  </Link> to get your API key.
                </Text>
              </Spacing>
            </Panel>
          </Spacing>
        ),
        onSaveSuccess: (project: ProjectType) => {
          if (project?.openai_api_key) {
            // @ts-ignore
            updatePipeline({
              pipeline: {
                llm,
              },
            });
          }
        },
      });
    };

    const llm: LLMType = {
      request: {
        block_uuid: block?.uuid,
        pipeline_uuid: pipeline?.uuid,
      },
    };

    return [
      {
        label: () => 'Document block (beta)',
        onClick: () => {
          llm.use_case = LLMUseCaseEnum.GENERATE_DOC_FOR_BLOCK;

          if (shouldShowModal) {
            showModal(llm);
          } else {
            // @ts-ignore
            updatePipeline({
              pipeline: {
                llm,
              },
            });
          }
        },
        uuid: 'Document block',
      },
      {
        label: () => 'Document pipeline and all blocks (beta)',
        onClick: () => {
          llm.use_case = LLMUseCaseEnum.GENERATE_DOC_FOR_PIPELINE;

          if (shouldShowModal) {
            showModal(llm);
          } else {
            // @ts-ignore
            updatePipeline({
              pipeline: {
                llm,
              },
            });
          }
        },
        uuid: 'Document pipeline and all blocks',
      },
      {
        label: () => 'Add comments in code (beta)',
        onClick: () => {
          if (shouldShowModal) {
            showModal(llm);
          } else {
            // @ts-ignore
            createLLM({
              llm: {
                request: {
                  block_code: content,
                },
                use_case: LLMUseCaseEnum.GENERATE_COMMENT_FOR_CODE,
              },
            });
          }
        },
        uuid: 'Add comments in code',
      },
    ];
  }, [
    block,
    content,
    createLLM,
    pipeline,
    project,
    showConfigureProjectModal,
    updatePipeline,
  ]);

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
          noPadding
          onClick={(e) => {
            pauseEvent(e);
            reset();
          }}
          uuid="close-menu"
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
          <>
            <ButtonGroup>
              <KeyboardShortcutButton
                backgroundColor={color?.accent}
                bold
                loading={isLoadingCreateCode}
                onClick={(e) => {
                  pauseEvent(e);
                  generateCode();
                }}
                pill
                uuid="generate-code"
              >
                Generate code
              </KeyboardShortcutButton>
              <KeyboardShortcutButton
                backgroundColor={color?.accentLight}
                bold
                loading={isLoadingCreateLLM}
                onClick={(e) => {
                  pauseEvent(e);
                  setShowAIActions(true);
                }}
                pill
                uuid="document-code"
              >
                Document code
              </KeyboardShortcutButton>
            </ButtonGroup>
            <ClickOutside
              disableEscape
              onClickOutside={() => setShowAIActions(false)}
              open={showAIActions}
            >
              <FlyoutMenu
                items={itemsAIActions}
                onClickCallback={() => setShowAIActions(false)}
                open={showAIActions}
                parentRef={refAIActions}
                rightOffset={UNIT * 4.75}
                topOffset={UNIT * 2}
                uuid="FileHeaderMenu/AI_actions"
              />
            </ClickOutside>
          </>
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
          } else if (KEY_CODE_ENTER === e.keyCode && refInputValue.current?.length >= 1) {
            pauseEvent(e);
            generateCode();
          }
        }}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onChange={(e) => {
          refInputValue.current = e.target.value;
        }}
        onFocus={() => setFocused(true)}
        paddingLeft={UNIT * 10}
        paddingRight={UNIT * 32}
        paddingVertical={UNIT * 1.5}
        placeholder="e.g. Read files from disk asynchronously"
        ref={refInput}
      />

      {focusArea}

      <DropdownStyle
        maxHeight={UNIT * 80}
        topOffset={refInputContainer?.current?.getBoundingClientRect().height - 1}
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
                    <FlexContainer flexDirection="column">
                      <Text breakSpaces default monospace xsmall>
                        {itemObject?.code}
                      </Text>
                      {itemObject?.description && (
                        <div style={{ marginTop: 2 }}>
                          <Text breakSpaces monospace muted xsmall>
                            {itemObject?.description}
                          </Text>
                        </div>
                      )}
                    </FlexContainer>
                  </RowStyle>
                );
              },
            },
          ]}
          maxResults={10}
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

        if (refButton?.current) {
          refButton.current.style.top = `${(top - lineHeight) - (ICON_SIZE / 2)}px`;
        }

        if (refInputContainer?.current) {
          refInputContainer.current.style.top = `${top}px`;
          const width = (refEditorContainer?.current?.getBoundingClientRect?.()?.width || 0) - WIDTH_OFFSET;
          refInputContainer.current.style.width = `${width}px`;
        }
      }}
      onMountCallback={(editor, monaco) => {
        if (onMountCallback) {
          onMountCallback?.(editor, monaco);
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
      if (project?.openai_api_key
        && selected
        && onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_PERIOD], keyMapping)
      ) {
        start();
      }
    },
    [
      project,
      selected,
    ],
  );

  useEffect(() => {
    setTimeout(() => {
      const width = (refEditorContainer?.current?.getBoundingClientRect?.()?.width || 0)
        - WIDTH_OFFSET;

      if (refInputContainer?.current) {
        refInputContainer.current.style.width = `${width}px`;
      }
    }, 1);
  }, [width]);

  return (
    <EditorWrapperStyle>
      {!!project?.openai_api_key && (
        <ButtonStyle ref={refButton}>
          <KeyboardShortcutButton
            noBackground
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
      )}

      {inputMemo}

      {editor}
    </EditorWrapperStyle>
  );
}

export default Editor;
