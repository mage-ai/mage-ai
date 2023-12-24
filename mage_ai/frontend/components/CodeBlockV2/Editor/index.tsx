import CodeEditor from '@components/CodeEditor';
import { CodeBlockEditorProps } from '../constants';

function Editor({
  autocompleteProviders,
  block,
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
}: CodeBlockEditorProps) {
  const {
    language,
  } = block;

  return (
    <CodeEditor
      autoHeight
      autocompleteProviders={autocompleteProviders}
      block={block}
      height={height}
      language={language}
      onChange={(val: string) => {
        onChange?.(val);
      }}
      onContentSizeChangeCallback={onContentSizeChangeCallback}
      onDidChangeCursorPosition={onDidChangeCursorPosition}
      onMountCallback={onMountCallback}
      placeholder={placeholder}
      selected={selected}
      setSelected={setSelected}
      setTextareaFocused={setTextareaFocused}
      shortcuts={shortcuts}
      textareaFocused={textareaFocused}
      value={content}
      width="100%"
    />
  );
}

export default Editor;
