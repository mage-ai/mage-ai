import { useEffect, useMemo, useRef } from 'react';
import { useMutation } from 'react-query';

import CodeEditor from '@components/CodeEditor';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
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
import {
  KEY_CODE_CONTROL,
  KEY_CODE_ENTER,
  KEY_CODE_ESCAPE,
  KEY_CODE_PERIOD,
} from '@utils/hooks/keyboardShortcuts/constants';
import { LEFT_PADDING } from '@components/CodeBlock/index.style';
import { LLMUseCaseEnum } from '@interfaces/LLMType';
import { UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { useError } from '@context/Error';
import { useKeyboardContext } from '@context/Keyboard';

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
  console.log('CodeBlockEditor RENDERRRRRRRRRRRRRRRR');

  const componentUUID = `CodeBlockEditorV2/${block?.uuid}/editor/button/AI`;
  const [showError] = useError(null, {}, [], {
    uuid: componentUUID,
  });

  const refButton = useRef(null);
  const refEditor = useRef(null);
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

  const [createCode, { isLoading: isLoadingCreateCode }] = useMutation(
    api.llms.useCreate(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            llm,
          }) => {
            console.log(llm);
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

  const inputMemo = useMemo(() => (
    <InputStyle color={color?.accent} ref={refInputContainer}>
      <CloseStyle>
        <KeyboardShortcutButton
          noBackground
          noBorder
          noPadding
          onClick={(e) => {
            pauseEvent(e);

            refButton.current.style.opacity = 1;
            refInputContainer.current.style.display = 'none';
          }}
        >
          <PanelCollapseRight default size={ICON_SIZE} />
        </KeyboardShortcutButton>
      </CloseStyle>

      {focusArea}

      <TextInput
        beforeIcon={<AISparkle size={2 * UNIT} />}
        buttonAfter={(
          <KeyboardShortcutButton
            backgroundColor={color?.accent}
            bold
            loading={isLoadingCreateCode}
            noBorder
            onClick={(e) => {
              pauseEvent(e);

              createCode({
                llm: {
                  request: {
                    block_description: refInputValue.current,
                    code_language: language,
                  },
                  use_case: LLMUseCaseEnum.GENERATE_CODE,
                },
              });
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
            refButton.current.style.opacity = 1;
            refInputContainer.current.style.display = 'none';
          } else if (KEY_CODE_ENTER === e.keyCode) {
            pauseEvent(e);

            createCode({
              llm: {
                request: {
                  block_description: refInputValue.current,
                  code_language: language,
                },
                use_case: LLMUseCaseEnum.GENERATE_CODE,
              },
            });
          }
        }}
        onChange={(e) => {
          refInputValue.current = e.target.value;
        }}
        paddingHorizontal={0}
        paddingRight={UNIT * 16}
        paddingVertical={UNIT * 1.5}
        placeholder="e.g. Read files from disk asynchronously"
        ref={refInput}
      />

      {focusArea}
    </InputStyle>
  ), [
    color,
    createCode,
    isLoadingCreateCode,
    language,
  ]);

  const editor = useMemo(() => (
    <CodeEditor
      autoHeight
      autocompleteProviders={autocompleteProviders}
      block={block}
      blockRef={blockRef}
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

        const editorHeight = editor?.getContentHeight();
        const linesCount = editor?.getModel()?.getLineCount();
        const lineHeight = editorHeight / linesCount;

        const top = lineNumber * lineHeight;

        refButton.current.style.top = `${(top - lineHeight) - (ICON_SIZE / 4)}px`;
        refInputContainer.current.style.top = `${top}px`;

        const width = (refEditor?.current?.getBoundingClientRect?.()?.width || 0)
          - WIDTH_OFFSET
        refInputContainer.current.style.width = `${width}px`;

        // console.log(
        //   editor?.getContentHeight(),
        //   editor?.getContentWidth(),
        //   editor?.getScrollHeight(),
        //   editor?.getScrollLeft(),
        //   editor?.getScrollTop(),
        //   editor?.getScrollWidth(),
        //   editor?.getModel()?.getLineCount(),
        // );
      }}
      onMountCallback={() => {
        if (onMountCallback) {
          onMountCallback?.();
        }

        setTimeout(() => {
          const width = (refEditor?.current?.getBoundingClientRect?.()?.width || 0)
            - WIDTH_OFFSET;
          refInputContainer.current.style.width = `${width}px`;
        }, 1);
      }}
      placeholder={placeholder}
      ref={refEditor}
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
        refButton.current.style.opacity = 0;
        refInputContainer.current.style.display = 'block';
        setTimeout(() => refInput?.current?.focus?.(), 1);
      }
    },
    [
      selected,
    ],
  );

  return (
    <EditorWrapperStyle>
      <ButtonStyle ref={refButton}>
        <KeyboardShortcutButton
          // keyboardShortcutValidation={({
          //   keyMapping,
          // }, index) => onlyKeysPresent([
          //   KEY_CODE_CONTROL,
          //   KEY_CODE_PERIOD,
          // ], keyMapping)}
          noBackground
          noBorder
          noPadding
          onClick={(e) => {
            if (selected) {
              pauseEvent(e);

              refButton.current.style.opacity = 0;
              refInputContainer.current.style.display = 'block';
              setTimeout(() => refInput?.current?.focus?.(), 1);
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
