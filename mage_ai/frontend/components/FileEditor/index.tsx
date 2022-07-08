import { useMemo, useState } from 'react';

import CodeEditor from '@components/CodeEditor';
import FileType from '@interfaces/FileType';

type FileEditorProps = {
  file: FileType;
};

function FileEditor({
  file,
}: FileEditorProps) {
  const codeEditorEl = useMemo(() => (
    <CodeEditor
      autoHeight
      language="text"
      // TODO (tommy dang): implement later; see Codeblock/index.tsx for example
      // onDidChangeCursorPosition={onDidChangeCursorPosition}
      placeholder="Start typing here..."
      selected
      textareaFocused
      value={file.content}
      width="100%"
    />
  ), [
    file.content,
  ]);

  return (
    <>
      {codeEditorEl}
    </>
  );
}

export default FileEditor;
