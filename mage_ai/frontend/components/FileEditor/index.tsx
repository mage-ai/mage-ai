import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useMutation } from 'react-query';

import CodeEditor from '@components/CodeEditor';
import FileType, { FILE_EXTENSION_TO_LANGUAGE_MAPPING } from '@interfaces/FileType';
import PipelineType from '@interfaces/PipelineType';
import api from '@api';
import {
  KEY_CODE_META,
  KEY_CODE_R,
  KEY_CODE_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { useKeyboardContext } from '@context/Keyboard';

type FileEditorProps = {
  filePath: string;
  pipeline: PipelineType;
  setFilesTouched: (data: {
    [path: string]: boolean;
  }) => void;
};

function FileEditor({
  filePath,
  pipeline,
  setFilesTouched,
}: FileEditorProps) {
  const [file, setFile] = useState<FileType>(null);
  const { data } = api.file_contents.detail(filePath);
  useEffect(() => {
    if (data?.file_content) {
      setFile(data.file_content);
    }
  }, [data]);

  const [content, setContent] = useState<string>(file?.content)
  const [touched, setTouched] = useState<boolean>(false);

  const [updateFile] = useMutation(
    api.file_contents.useUpdate(file?.path),
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
  const saveFile = (value: string, f: FileType) => {
    // @ts-ignore
    updateFile({
      file_content: {
        ...f,
        content: value,
      },
    });
    // @ts-ignore
    setFilesTouched((prev: {
      [path: string]: boolean;
    }) => ({
      ...prev,
      [f?.path]: false,
    }));
    setTouched(false);
  };

  const codeEditorEl = useMemo(() => {
    if (file?.path) {
      const regex =
        new RegExp(
          Object
            .keys(FILE_EXTENSION_TO_LANGUAGE_MAPPING)
            .map(ext => `\.(${ext})$`).join('|'),
          );
      const fileExtension = file.path.match(regex)[0]?.split('.')[1];

      return (
        <CodeEditor
          autoHeight
          language={FILE_EXTENSION_TO_LANGUAGE_MAPPING[fileExtension]}
          onSave={(value: string) => {
            saveFile(value, file);
          }}
          // TODO (tommy dang): implement later; see Codeblock/index.tsx for example
          // onDidChangeCursorPosition={onDidChangeCursorPosition}
          onChange={(value: string) => {
            setContent(value);
            // @ts-ignore
            setFilesTouched((prev: {
              [path: string]: boolean;
            }) => ({
              ...prev,
              [file?.path]: true,
            }));
            setTouched(true);
          }}
          selected
          textareaFocused
          value={file?.content}
          width="100%"
        />
      );
    }
  }, [
    file,
    saveFile,
    setFilesTouched,
    updateFile,
  ]);

  const uuidKeyboard = `FileEditor/${file?.path}`;
  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);
  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping, keyHistory) => {
      if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_S], keyMapping)) {
        event.preventDefault();
        saveFile(content, file);
      } else if (touched && onlyKeysPresent([KEY_CODE_META, KEY_CODE_R], keyMapping)) {
        event.preventDefault();
        const warning = `${file.path} has changes that are unsaved. ` +
          'Click cancel and save your changes before reloading page.';
        if (typeof window !== 'undefined' && typeof location !== 'undefined' && window.confirm(warning)) {
          location.reload();
        }
      }
    },
    [
      content,
      file,
      saveFile,
      touched,
    ],
  );

  return (
    <>
      {codeEditorEl}
    </>
  );
}

export default FileEditor;
