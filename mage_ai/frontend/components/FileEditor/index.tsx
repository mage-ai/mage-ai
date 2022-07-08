import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import CodeEditor from '@components/CodeEditor';
import FileType from '@interfaces/FileType';
import api from '@api';
import { onSuccess } from '@api/utils/response';

type FileEditorProps = {
  file: FileType;
};

function FileEditor({
  file,
}: FileEditorProps) {
  const [updateFile] = useMutation(
    api.file_contents.useUpdate(file.path),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => true,
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
        },
      ),
    },
  );

  const codeEditorEl = useMemo(() => (
    <CodeEditor
      autoHeight
      language="text"
      onSave={(content: string) => {
        // @ts-ignore
        updateFile({
          file_content: {
            ...file,
            content,
          },
        });
      }}
      // TODO (tommy dang): implement later; see Codeblock/index.tsx for example
      // onDidChangeCursorPosition={onDidChangeCursorPosition}
      selected
      textareaFocused
      value={file.content}
      width="100%"
    />
  ), [
    file,
    updateFile,
  ]);

  return (
    <>
      {codeEditorEl}
    </>
  );
}

export default FileEditor;
