import useWebSocket from 'react-use-websocket';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation } from 'react-query';

import BlockType, { BlockRequestPayloadType, BlockTypeEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import CodeEditor from '@components/CodeEditor';
import FileType, {
  FileExtensionEnum,
  FILE_EXTENSION_TO_LANGUAGE_MAPPING,
  SpecialFileEnum,
} from '@interfaces/FileType';
import KernelOutputType, { ExecutionStateEnum } from '@interfaces/KernelOutputType';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';

import { DEFAULT_TERMINAL_UUID } from '@components/Terminal';
import {
  KEY_CODE_CONTROL,
  KEY_CODE_META,
  KEY_CODE_R,
  KEY_CODE_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import {
  buildAddBlockRequestPayload,
  buildFileExtensionRegExp,
  getBlockType,
  getBlockUUID,
} from './utils';
import { find } from '@utils/array';
import { getBlockFromFile } from '../FileBrowser/utils';
import { getNonPythonBlockFromFile } from '@components/FileBrowser/utils';
import { getWebSocket } from '@api/utils/url';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { useKeyboardContext } from '@context/Keyboard';

type FileEditorProps = {
  active: boolean;
  addNewBlock: (b: BlockRequestPayloadType, cb: any) => void;
  fetchPipeline: () => void;
  filePath: string;
  openSidekickView: (newView: ViewKeyEnum) => void;
  pipeline: PipelineType;
  projectName: string;
  selectedFilePath: string;
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
  openSidekickView,
  pipeline,
  projectName,
  selectedFilePath,
  setFilesTouched,
  setSelectedBlock,
}: FileEditorProps) {
  const [file, setFile] = useState<FileType>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const containerRef = useRef(null);

  const { data: serverStatus } = api.status.list();
  const repoPath = serverStatus?.status?.repo_path;
  const { data } = api.file_contents.detail(filePath);
  useEffect(() => {
    if (data?.file_content) {
      setFile(data.file_content);
    }
  }, [data]);

  const [content, setContent] = useState<string>(file?.content);
  const [touched, setTouched] = useState<boolean>(false);

  useEffect(() => {
    if (selectedFilePath) {
      containerRef?.current?.scrollIntoView();
    }
  }, [selectedFilePath]);

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

  const regex = useMemo(() => buildFileExtensionRegExp(), []);

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

  const addToPipelineEl = (
    fileExtension === FileExtensionEnum.PY
    || fileExtension === FileExtensionEnum.SQL
    || (
      (fileExtension === FileExtensionEnum.YAML || fileExtension === FileExtensionEnum.R)
        && getNonPythonBlockFromFile(file, file?.path)
      )
    )
    && getBlockType(file.path.split('/')) !== BlockTypeEnum.SCRATCHPAD
    && getBlockFromFile(file)
    && (
    <Spacing p={2}>
      <Button
        borderLess
        compact
        onClick={() => {
          const isIntegrationPipeline = pipeline.type === PipelineTypeEnum.INTEGRATION;

          const blockReqPayload = buildAddBlockRequestPayload(
            file,
            repoPath,
            pipeline,
          );

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
        primary
        small
      >
        Add to current pipeline
      </Button>
    </Spacing>
  );

  const {
    lastJsonMessage,
    sendMessage,
  } = useWebSocket(getWebSocket(), {
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (lastJsonMessage) {
      // @ts-ignore
      const jsonMessage: KernelOutputType = lastJsonMessage;
      const executionState = jsonMessage?.execution_state;
      const messageUUID = jsonMessage?.uuid;

      if (messageUUID === DEFAULT_TERMINAL_UUID) {
        if (ExecutionStateEnum.BUSY === executionState) {
          setLoading(true);
        } else if (ExecutionStateEnum.IDLE === executionState) {
          setLoading(false);
        }
      }
    }
  }, [
    lastJsonMessage,
    setLoading,
  ]);

  const installPackagesButtonEl = (
    <Spacing m={2}>
      <KeyboardShortcutButton
        disabled={!repoPath}
        inline
        loading={loading}
        onClick={() => {
          openSidekickView(ViewKeyEnum.TERMINAL);
          sendMessage(JSON.stringify({
            code: `!pip install -r ${repoPath}/requirements.txt`,
            uuid: DEFAULT_TERMINAL_UUID,
          }));
        }}
        title={!repoPath
          ? 'Please use right panel terminal to install packages.'
          : 'Pip install packages from your saved requirements.txt file (⌘+S to save).'
        }
        uuid="FileEditor/InstallPackages"
      >
        Install packages
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
      {addToPipelineEl}
      {codeEditorEl}
      {filePath === SpecialFileEnum.REQS_TXT && installPackagesButtonEl}
    </div>
  );
}

export default FileEditor;
