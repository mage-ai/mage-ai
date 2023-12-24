import { useMemo, useRef } from 'react';

import CodeEditor from '@components/CodeEditor';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import TextInput from '@oracle/elements/Inputs/TextInput';
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
  KEY_CODE_ESCAPE,
  KEY_CODE_FORWARD_SLASH,
} from '@utils/hooks/keyboardShortcuts/constants';
import { LEFT_PADDING } from '@components/CodeBlock/index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { getColorsForBlockType } from '@components/CodeBlock/index.style';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { pauseEvent } from '@utils/events';

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

  const focusArea = useMemo(() => (
    <TextInputFocusAreaStyle
      onClick={() => refInput?.current?.focus()}
    />
  ), [
  ]);

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
            noBorder
            onClick={(e) => {
              pauseEvent(e);

              refButton.current.style.opacity = 1;
              refInputContainer.current.style.display = 'none';
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
        // Need setTimeout because when clicking a row, the onBlur will be triggered.
        // If the onBlur triggers too soon, clicking a row does nothing.
        onKeyDown={(e) => {
          if (KEY_CODE_ESCAPE === e.keyCode) {
            pauseEvent(e);
            refButton.current.style.opacity = 1;
            refInputContainer.current.style.display = 'none';
          }
        }}
        onBlur={() => {
          refButton.current.style.opacity = 1;
          refInputContainer.current.style.display = 'none';
        }}
        onChange={(e) => {
          refInputValue.current = e.target.value;
        }}
        // onFocus={() => setFocused(true)}
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

  return (
    <EditorWrapperStyle>
      <ButtonStyle ref={refButton}>
        <KeyboardShortcutButton
          keyboardShortcutValidation={({
            keyMapping,
          }, index) => onlyKeysPresent([
            KEY_CODE_CONTROL,
            KEY_CODE_FORWARD_SLASH,
          ], keyMapping)}
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
          uuid={`KeyboardShortcutButton/${block?.uuid}/editor/button/AI`}
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
