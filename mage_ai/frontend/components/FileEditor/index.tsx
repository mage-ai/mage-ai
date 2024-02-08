import * as path from 'path';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useGlobalState } from '@storage/state';
import { useMutation } from 'react-query';

import AuthToken from '@api/utils/AuthToken';
import BlockType, { BlockRequestPayloadType, BlockTypeEnum } from '@interfaces/BlockType';
import Button from '@oracle/elements/Button';
import ButtonGroup from '@oracle/elements/Button/ButtonGroup';
import CodeEditor from '@components/CodeEditor';
import ErrorsType from '@interfaces/ErrorsType';
import FileType, {
  FILE_EXTENSION_TO_LANGUAGE_MAPPING,
  FileExtensionEnum,
  OriginalContentMappingType,
  PIPELINE_BLOCK_EXTENSIONS,
  SpecialFileEnum,
} from '@interfaces/FileType';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineType, { PipelineTypeEnum } from '@interfaces/PipelineType';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import useAutoScroll from '@components/CodeEditor/useAutoScroll';
import { DEBUG } from '@utils/environment';
import {
  KEY_CODE_CONTROL,
  KEY_CODE_META,
  KEY_CODE_R,
  KEY_CODE_S,
} from '@utils/hooks/keyboardShortcuts/constants';
import { OAUTH2_APPLICATION_CLIENT_ID } from '@api/constants';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import {
  buildAddBlockRequestPayload,
  buildFileExtensionRegExp,
  getBlockType,
} from './utils';
import { find } from '@utils/array';
import { isJsonString } from '@utils/string';
import { errorOrSuccess, onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { useKeyboardContext } from '@context/Keyboard';
import { useWindowSize } from '@utils/sizes';

type FileEditorProps = {
  active: boolean;
  addNewBlock?: (b: BlockRequestPayloadType, cb: any) => void;
  contained?: boolean;
  containerRef?: any;
  disableRefreshWarning?: boolean;
  fetchPipeline?: () => void;
  fetchVariables?: () => void;
  filePath: string;
  codeEditorMaximumHeightOffset?: number;
  hideHeaderButtons?: boolean;
  onContentChange?: (content: string) => void;
  onFileFetched?: (file: FileType) => void;
  onMountCallback?: (editor?: any) => void;
  onUpdateFileSuccess?: (fileContent: FileType) => void;
  openSidekickView?: (newView: ViewKeyEnum) => void;
  originalContent?: OriginalContentMappingType;
  pipeline?: PipelineType;
  saveFile?: (value: string, file: FileType) => void;
  selectedFilePath: string;
  sendTerminalMessage?: (message: string, keep?: boolean) => void;
  setDisableShortcuts?: (disableShortcuts: boolean) => void;
  setErrors?: (errors: ErrorsType) => void;
  setFilesTouched?: (data: {
    [path: string]: boolean;
  }) => void;
  setSelectedBlock?: (block: BlockType) => void;
  updateFile?: (payload: { file_content: FileType }) => any;
};

function FileEditor({
  active,
  addNewBlock,
  contained,
  containerRef: containerRefProp,
  disableRefreshWarning,
  fetchPipeline,
  fetchVariables,
  filePath,
  codeEditorMaximumHeightOffset,
  hideHeaderButtons,
  onContentChange,
  onFileFetched,
  onMountCallback,
  onUpdateFileSuccess,
  openSidekickView,
  originalContent,
  pipeline,
  saveFile: saveFileProp,
  selectedFilePath,
  sendTerminalMessage,
  setDisableShortcuts,
  setErrors,
  setFilesTouched,
  setSelectedBlock,
  updateFile: updateFileProp,
}: FileEditorProps) {
  const renderRef = useRef(0);
  DEBUG(() => {
    renderRef.current += 1;
    console.log(`[FileEditor][${filePath}]: ${renderRef.current} renders`);
  });

  const [, setApiReloads] = useGlobalState('apiReloads');
  const [file, setFile] = useState<FileType>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const containerRef = containerRefProp || useRef(null);
  const editorRef = useRef(null);

  const { height: heightTotal } = useWindowSize();

  const token = useMemo(() => new AuthToken(), []);
  const oauthWebsocketData = useMemo(() => ({
    api_key: OAUTH2_APPLICATION_CLIENT_ID,
    token: token.decodedToken.token,
  }), [
    token,
  ]);

  const { data: serverStatus } = api.statuses.list();
  const repoPath = useMemo(() => serverStatus?.statuses?.[0]?.repo_path, [serverStatus]);
  const { data } = api.file_contents.detail(filePath);
  useEffect(() => {
    if (data?.file_content) {
      setFile(data.file_content);
      if (onFileFetched) {
        onFileFetched?.(data.file_content);
      }
    } else if (data?.error) {
      errorOrSuccess(data, {
        onErrorCallback: (response, errors) => setErrors({
          errors,
          response,
        }),
      });
    }
  }, [data, setErrors]);

  const [content, setContentState] = useState<string>(file?.content);
  const setContent = useCallback((content: string) => {
    setContentState(content);
    if (onContentChange) {
      onContentChange?.(content);
    }
  }, [onContentChange]);
  const [touched, setTouched] = useState<boolean>(false);

  const isSelected = useMemo(() => encodeURIComponent(selectedFilePath) === filePath, [
    filePath,
    selectedFilePath,
  ]);

  useEffect(() => {
    if (isSelected) {
      containerRef?.current?.scrollIntoView();

      if (editorRef?.current) {
        editorRef?.current?.focus();
      }
    }
  }, [isSelected]);

  const [updateFile] = useMutation(
    payload => updateFileProp
      ? updateFileProp(payload)
      : api.file_contents.useUpdate(file?.path && encodeURIComponent(file?.path))(payload),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            file_content: fc,
          }) => {
            setApiReloads(prev => ({
              ...prev,
              [`FileVersions/${file?.path}`]: Number(new Date()),
            }));

            if (onUpdateFileSuccess) {
              onUpdateFileSuccess?.(fc);
            }
          },
          onErrorCallback: (response, errors) => setErrors?.({
            errors,
            response,
          }),
        },
      ),
    },
  );
  const saveFile = useCallback((value: string, f: FileType) => {
    if (saveFileProp) {
      return saveFileProp(value, f);
    }

    // @ts-ignore
    updateFile({
      file_content: {
        ...f,
        content: value,
      },
    }).then(() => {
      const fileName = decodeURIComponent(filePath).split(path.sep).pop();
      if (fileName === SpecialFileEnum.METADATA_YAML && fetchVariables) {
        fetchVariables?.();
      }
    });
    // @ts-ignore
    setFilesTouched?.((prev: {
      [path: string]: boolean;
    }) => ({
      ...prev,
      [f?.path]: false,
    }));
    setTouched(false);
  }, [
    fetchVariables,
    filePath,
    saveFileProp,
    setFilesTouched,
    updateFile,
  ]);

  const regex = useMemo(() => buildFileExtensionRegExp(), []);

  const fileExtension = useMemo(() => (
    file?.path?.match(regex) === null
      ? FileExtensionEnum.TXT
      : file?.path?.match(regex)?.[0]?.split('.')[1]
  ),
    [regex, file],
  );

  const originalValues = useMemo(() => originalContent?.[file?.path], [
    file,
    originalContent,
  ]);

  const {
    onDidChangeCursorPosition,
  } = useAutoScroll({
    contained,
    containerRef,
  });

  const codeEditorEl = useMemo(() => {
    if (file?.path) {
      const showDiffs = !!originalValues && originalValues?.content_from_base;

      return (
        <CodeEditor
          autoHeight
          height={codeEditorMaximumHeightOffset ? heightTotal - codeEditorMaximumHeightOffset : null}
          language={FILE_EXTENSION_TO_LANGUAGE_MAPPING[fileExtension]}
          onDidChangeCursorPosition={onDidChangeCursorPosition}
          onChange={(value: string) => {
            setContent(value);
            if (setFilesTouched) {
              // @ts-ignore
              setFilesTouched((prev: {
                [path: string]: boolean;
              }) => {
                if (prev?.[file?.path]) {
                  return prev;
                }

                return {
                  ...prev,
                  [file?.path]: true,
                };
              });
            }
            setTouched(true);
          }}
          onMountCallback={(editor) => {
            editorRef.current = editor;

            if (setDisableShortcuts) {
              editor.onDidFocusEditorWidget = () => {
                setDisableShortcuts?.(true);
              };
            }
            if (setDisableShortcuts) {
              editor.onDidBlurEditorWidget = () => {
                setDisableShortcuts?.(false);
              };
            }

            if (onMountCallback) {
              onMountCallback?.(editor);
            }
          }}
          onSave={(value: string) => {
            saveFile(value, file);
          }}
          originalValue={originalValues?.content_from_base}
          padding={10}
          readOnly={!!showDiffs}
          selected
          showDiffs={!!showDiffs}
          textareaFocused
          value={isJsonString(file?.content)
            ? JSON.stringify(JSON.parse(file?.content), null, 2)
            : file?.content
          }
          width="100%"
        />
      );
    }
  }, [
    codeEditorMaximumHeightOffset,
    file,
    fileExtension,
    heightTotal,
    onMountCallback,
    originalValues,
    saveFile,
    setContent,
    setFilesTouched,
  ]);

  const dataExporterBlock: BlockType = pipeline?.blocks
    ? find(pipeline?.blocks, ({ type }) => BlockTypeEnum.DATA_EXPORTER === type)
    : null;
  const [updateDestinationBlock] = useMutation(
    api.blocks.pipelines.useUpdate(
      encodeURIComponent(pipeline?.uuid),
      encodeURIComponent(dataExporterBlock?.uuid),
    ),
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

  const addToPipelineEl = addNewBlock
    && pipeline
    && file
    // @ts-ignore
    && PIPELINE_BLOCK_EXTENSIONS.includes(fileExtension)
    && getBlockType(file?.path?.split(path.sep))
    && (
    <Button
      onClick={() => {
        const isIntegrationPipeline = pipeline?.type === PipelineTypeEnum.INTEGRATION;

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
            setSelectedBlock?.(block);
          },
        );
      }}
      primary
    >
      Add to current pipeline
    </Button>
  );

  const installPackagesButtonEl = sendTerminalMessage && (
    <Spacing m={2}>
      <KeyboardShortcutButton
        disabled={!repoPath}
        inline
        loading={loading}
        onClick={() => {
          openSidekickView?.(ViewKeyEnum.TERMINAL);
          sendTerminalMessage?.(JSON.stringify({
            ...oauthWebsocketData,
            command: ['stdin', `pip install -r ${repoPath}/requirements.txt\r`],
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

  const uuidKeyboard = `FileEditor/${file?.path || filePath}`;
  const {
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);
  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping) => {
      if (active && !disableRefreshWarning) {
        if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_S], keyMapping)
          || onlyKeysPresent([KEY_CODE_CONTROL, KEY_CODE_S], keyMapping)
        ) {
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
      disableRefreshWarning,
      file,
      saveFile,
      touched,
    ],
  );

  return (
    <div ref={containerRefProp ? null : containerRef}>
      {!hideHeaderButtons && (
        <Spacing p={2}>
          <FlexContainer justifyContent="space-between">
            <ButtonGroup>
              {addToPipelineEl}

              <Button
                disabled={!content}
                onClick={(e) => {
                  e.preventDefault();
                  saveFile(content, file);
                }}
                title={content ? null : 'No changes have been made to this file.'}
              >
                Save file content
              </Button>
            </ButtonGroup>

            {openSidekickView && (
              <ButtonGroup>
                <Button
                  compact
                  onClick={() => {
                    openSidekickView(ViewKeyEnum.FILE_VERSIONS);
                  }}
                  small
                  title="View previous changes to this file."
                >
                  Show versions
                </Button>
              </ButtonGroup>
            )}
          </FlexContainer>
        </Spacing>
      )}

      {codeEditorEl}

      {filePath === SpecialFileEnum.REQS_TXT && installPackagesButtonEl}
    </div>
  );
}

export default FileEditor;
