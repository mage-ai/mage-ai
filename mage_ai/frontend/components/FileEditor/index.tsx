import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation } from 'react-query';

import BlockType, { BlockRequestPayloadType, BlockTypeEnum } from '@interfaces/BlockType';
import CodeEditor from '@components/CodeEditor';
import FileType, { FileExtensionEnum, FILE_EXTENSION_TO_LANGUAGE_MAPPING } from '@interfaces/FileType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import {
  KEY_CODE_CONTROL,
  KEY_CODE_META,
  KEY_CODE_R,
  KEY_CODE_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import { find } from '@utils/array';
import { getBlockType, getBlockUUID } from './utils';
import { getNonPythonBlockFromFile } from '@components/FileBrowser/utils';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { useKeyboardContext } from '@context/Keyboard';

type FileEditorProps = {
  active: boolean;
  addNewBlock: (b: BlockRequestPayloadType, cb: any) => void;
  fetchPipeline: () => void;
  filePath: string;
  pipeline: PipelineType;
  setFilesTouched: (data: {
    [path: string]: boolean;
  }) => void;
  setSelectedBlock: (block: BlockType) => void;
};

function FileEditor({
  active,
  addNewBlock,
  fetchPipeline,
  filePath,
  pipeline,
  setFilesTouched,
  setSelectedBlock,
}: FileEditorProps) {
  const [file, setFile] = useState<FileType>(null);
  const containerRef = useRef(null);
  const { data } = api.file_contents.detail(filePath);
  useEffect(() => {
    if (data?.file_content) {
      setFile(data.file_content);
    }
  }, [data]);

  const [content, setContent] = useState<string>(file?.content);
  const [touched, setTouched] = useState<boolean>(false);

  useEffect(() => {
    containerRef?.current?.scrollIntoView();
  }, [containerRef?.current]);

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

  const regex = useMemo(() => (
    new RegExp(
      Object
        .keys(FILE_EXTENSION_TO_LANGUAGE_MAPPING)
        .map(ext => `\.(${ext})$`).join('|'),
    )
  ), []);

  const fileExtension = useMemo(() => file?.path.match(regex)[0]?.split('.')[1], [regex, file]);

  const codeEditorEl = useMemo(() => {
    if (file?.path) {
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
    fileExtension,
    saveFile,
    setFilesTouched,
  ]);

  const dataExporterBlock: BlockType = find(pipeline?.blocks, ({ type }) => BlockTypeEnum.DATA_EXPORTER === type);
  const [updateDestinationBlock] = useMutation(
    api.blocks.pipelines.useUpdate(pipeline?.uuid, dataExporterBlock?.uuid),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipeline?.();
          },
        },
      ),
    },
  );

  const addToPipelineEl = (fileExtension === FileExtensionEnum.PY || fileExtension === FileExtensionEnum.SQL
    || ((fileExtension === FileExtensionEnum.YAML || fileExtension === FileExtensionEnum.R)
      && getNonPythonBlockFromFile(file, file?.path))
    ) && getBlockType(file.path.split('/')) !== BlockTypeEnum.SCRATCHPAD && (
    <Spacing p={2}>
      <KeyboardShortcutButton
        inline
        onClick={() => {
          const isIntegrationPipeline = pipeline.type === PipelineTypeEnum.INTEGRATION;
          const blockReqPayload: BlockRequestPayloadType = {
            language: FILE_EXTENSION_TO_LANGUAGE_MAPPING[fileExtension],
            name: getBlockUUID(file.path.split('/')),
            type: getBlockType(file.path.split('/')),
          };

          if (isIntegrationPipeline) {
            const dataLoaderBlock: BlockType = find(pipeline.blocks, ({ type }) => BlockTypeEnum.DATA_LOADER === type);
            const upstreamBlocks = dataExporterBlock?.upstream_blocks
              ? dataExporterBlock.upstream_blocks
              : (dataLoaderBlock ? [dataLoaderBlock.uuid] : []);
            blockReqPayload.upstream_blocks = upstreamBlocks;
          }

          addNewBlock(
            blockReqPayload,
            block => {
              if (isIntegrationPipeline && dataExporterBlock) {
                // @ts-ignore
                updateDestinationBlock({
                  block: {
                    ...dataExporterBlock,
                    upstream_blocks: [block.uuid],
                  },
                });
              }
              setSelectedBlock(block);
            },
          );
        }}
        uuid="FileEditor/AddToCurrentPipeline"
      >
        Add to current pipeline
      </KeyboardShortcutButton>
    </Spacing>
  );

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
      if (active) {
        if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_S], keyMapping) || onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_S], keyMapping)) {
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
      }
    },
    [
      active,
      content,
      file,
      saveFile,
      touched,
    ],
  );

  return (
    <div ref={containerRef}>
      {codeEditorEl}
      {addToPipelineEl}
    </div>
  );
}

export default FileEditor;
