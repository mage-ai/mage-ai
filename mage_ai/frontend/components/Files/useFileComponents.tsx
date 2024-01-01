import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGlobalState } from '@storage/state';
import { useMutation } from 'react-query';

import ApiReloader from '@components/ApiReloader';
import BlockType, { BlockRequestPayloadType, BlockTypeEnum } from '@interfaces/BlockType';
import Controller from '@components/FileEditor/Controller';
import Dashboard from '@components/Dashboard';
import FileBrowser from '@components/FileBrowser';
import FileEditorHeader from '@components/FileEditor/Header';
import FileTabs from '@components/PipelineDetail/FileTabs';
import FileType, {
  FILES_QUERY_INCLUDE_HIDDEN_FILES,
} from '@interfaces/FileType';
import FileVersions from '@components/FileVersions';
import PipelineType from '@interfaces/PipelineType';
import api from '@api';
import {
  HeaderStyle,
  MAIN_CONTENT_TOP_OFFSET,
  MenuStyle,
  TabsStyle,
} from './index.style';
import {
  KEY_CODE_META,
  KEY_CODE_R,
} from '@utils/hooks/keyboardShortcuts/constants';
import { ViewKeyEnum } from '@components/Sidekick/constants';
import {
  LOCAL_STORAGE_KEY_SHOW_HIDDEN_FILES,
  addOpenFilePath as addOpenFilePathLocalStorage,
  getOpenFilePaths,
  removeOpenFilePath as removeOpenFilePathLocalStorage,
  setOpenFilePaths as setOpenFilePathsLocalStorage,
} from '@storage/files';
import { get, set } from '@storage/localStorage';
import { getFilenameFromFilePath } from './utils';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { useError } from '@context/Error';
import { useKeyboardContext } from '@context/Keyboard';

type UseFileComponentsProps = {
  addNewBlock?: (
    b: BlockRequestPayloadType,
    cb: (block: BlockType) => void,
    opts?: {
      disableFetchingFiles?: boolean;
    },
  ) => void;
  blocks?: BlockType[];
  deleteWidget?: (value: BlockType) => void;
  disableContextMenu?: boolean;
  fetchAutocompleteItems?: () => void;
  fetchPipeline?: () => void;
  fetchVariables?: () => void;
  onCreateFile?: (file: FileType) => void;
  onOpenFile?: (filePath: string, isFolder: boolean) => void;
  onSelectBlockFile?: (
    blockUUID: string,
    blockType: BlockTypeEnum,
    filePath: string,
  ) => void;
  onSelectFile?: (filePath: string) => void;
  onUpdateFileSuccess?: (fileContent: FileType, opts?: {
    blockUUID: string;
  }) => void;
  openSidekickView?: (
    newView: ViewKeyEnum,
    pushHistory?: boolean,
    opts?: {
      addon?: string;
      blockUUID: string;
      // http://localhost:3000/pipelines/delicate_field/edit?addon=conditionals&sideview=power_ups&extension=great_expectations
      extension?: string;
    },
  ) => void;
  pipeline?: PipelineType;
  query?: {
    pattern?: string;
  };
  selectedFilePath?: string;
  sendTerminalMessage?: (message: string, keep?: boolean) => void;
  setDisableShortcuts?: (disableShortcuts: boolean) => void;
  setSelectedBlock?: (value: BlockType) => void;
  showHiddenFilesSetting?: boolean;
  uuid?: string;
  widgets?: BlockType[];
};

function useFileComponents({
  addNewBlock,
  blocks,
  deleteWidget,
  disableContextMenu,
  fetchAutocompleteItems,
  fetchPipeline,
  fetchVariables,
  onCreateFile,
  onOpenFile,
  onSelectBlockFile,
  onSelectFile,
  onUpdateFileSuccess,
  openSidekickView,
  pipeline,
  query,
  selectedFilePath: selectedFilePathDefault,
  sendTerminalMessage,
  setDisableShortcuts,
  setSelectedBlock,
  showHiddenFilesSetting,
  uuid,
  widgets,
}: UseFileComponentsProps = {}) {
  const [, setApiReloads] = useGlobalState('apiReloads');
  const [showError] = useError(null, {}, [], {
    uuid: `useFileComponents/${uuid}`,
  });
  const [showHiddenFiles, setShowHiddenFiles] = useState<boolean>(
    get(LOCAL_STORAGE_KEY_SHOW_HIDDEN_FILES, false),
  );

  const fileTreeRef = useRef(null);
  const contentByFilePath = useRef(null);
  const setContentByFilePath = useCallback((data: {
    [filePath: string]: string;
  }) => {
    if (!contentByFilePath.current) {
      contentByFilePath.current = {};
    }

    contentByFilePath.current = {
      ...contentByFilePath.current,
      ...data,
    };
  }, [contentByFilePath]);

  const [openFilePaths, setOpenFilePathsState] = useState<string[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>(null);
  const [filesTouched, setFilesTouched] = useState<{
    [filePath: string]: boolean;
  }>({});
  const [fileVersionsVisible, setFilesVersionsVisible] = useState<boolean>(false);

  const openFilenameMapping = useMemo(() => openFilePaths.reduce((acc, filePath: string) => {
    const filename = getFilenameFromFilePath(filePath);
    if (!acc[filename]) {
      acc[filename] = [];
    }
    acc[filename].push(filePath);

    return acc;
  }, {}), [openFilePaths]);

  const setOpenFilePaths = useCallback((filePaths: string[]) => {
    setOpenFilePathsLocalStorage(filePaths);
    setOpenFilePathsState(filePaths);
  }, []);

  const addOpenFilePath = useCallback((filePath: string) => {
    setOpenFilePaths(addOpenFilePathLocalStorage(filePath));
  }, [setOpenFilePaths]);

  const removeOpenFilePath = useCallback((filePath: string) => {
    setContentByFilePath({ [filePath]: null });
    setFilesTouched(prev => ({
      ...prev,
      [filePath]: false,
    }));

    const arr = removeOpenFilePathLocalStorage(filePath);
    setOpenFilePaths(arr);

    if (selectedFilePath === filePath && arr?.length >= 1) {
      setSelectedFilePath(arr[arr.length - 1]);
    }

    if (arr?.length === 0) {
      setSelectedFilePath(null);
    }
  }, [
    selectedFilePath,
    setContentByFilePath,
    setOpenFilePaths,
  ]);

  const openFile = useCallback((filePath: string, isFolder?: boolean) => {
    if (!isFolder) {
      addOpenFilePath(filePath);
      setSelectedFilePath(filePath);
    }

    if (onOpenFile) {
      onOpenFile?.(filePath, isFolder);
    }
  }, [addOpenFilePath, onOpenFile]);

  useEffect(() => {
    const arr = getOpenFilePaths();

    let fp;
    if (selectedFilePathDefault) {
      fp = decodeURIComponent(selectedFilePathDefault);
      if (!arr?.includes(fp)) {
        arr.push(fp);
        openFile(fp);
      }
    }

    setSelectedFilePath((prev) => {
      if (fp) {
        return fp;
      } else if (!prev && arr?.length >= 1) {
        return arr[0];
      }

      return prev;
    });

    setOpenFilePaths(arr);
  }, [
    openFile,
    selectedFilePathDefault,
    setOpenFilePaths,
  ]);

  const toggleShowHiddenFiles = useCallback(() => {
    const updatedShowHiddenFiles = !showHiddenFiles;
    setShowHiddenFiles(updatedShowHiddenFiles);
    set(LOCAL_STORAGE_KEY_SHOW_HIDDEN_FILES, updatedShowHiddenFiles);
  }, [showHiddenFiles]);

  const { data: filesData, mutate: fetchFiles } = api.files.list(
    (showHiddenFilesSetting && showHiddenFiles)
      ? {
        ...FILES_QUERY_INCLUDE_HIDDEN_FILES,
        ...query,
      } : query,
  );
  const files = useMemo(() => filesData?.files || [], [filesData]);

  const uuidKeyboard = 'Files/index';
  const {
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuidKeyboard);
  }, [unregisterOnKeyDown, uuidKeyboard]);

  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping) => {
      const filenamesTouched =
        Object.entries(filesTouched).reduce((acc, [k, v]) => v ? acc.concat(k) : acc, []);
      if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_R], keyMapping)
        && filenamesTouched?.length >= 1
      ) {
        event.preventDefault();

        const warning =
          `You have changes that are unsaved: ${filenamesTouched.join(', ')}. ` +
          'Click cancel and save your changes before reloading page.';

        if (typeof window !== 'undefined'
          && typeof location !== 'undefined'
          && window.confirm(warning)
        ) {
          location.reload();
        }
      }

      if (disableGlobalKeyboardShortcuts) {
        return;
      }
    },
    [
      filesTouched,
    ],
  );

  const [updateFile] = useMutation(
    (file: FileType) => api.file_contents.useUpdate(file?.path && encodeURIComponent(file?.path))({
      file_content: file,
    }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            file_content: file,
          }) => {
            setApiReloads(prev => ({
              ...prev,
              [`FileVersions/${file?.path}`]: Number(new Date()),
            }));
            setContentByFilePath({
              [file?.path]: null,
            });

            if (onUpdateFileSuccess) {
              onUpdateFileSuccess?.(file);
            }
          },
          onErrorCallback: (response, errors) => showError({
            errors,
            response,
          }),
        },
      ),
    },
  );
  const saveFile = useCallback((value: string, f: FileType) => {
    // @ts-ignore
    updateFile({
      ...f,
      content: value,
    });
    // @ts-ignore
    setFilesTouched((prev: {
      [path: string]: boolean;
    }) => ({
      ...prev,
      [f?.path]: false,
    }));
  }, [
    setFilesTouched,
    updateFile,
  ]);

  const fileBrowserMemo = useMemo(() => (
    <FileBrowser
      addNewBlock={addNewBlock}
      blocks={blocks}
      deleteWidget={deleteWidget}
      disableContextMenu={disableContextMenu}
      fetchAutocompleteItems={fetchAutocompleteItems}
      fetchFiles={fetchFiles}
      fetchPipeline={fetchPipeline}
      files={files}
      showHiddenFilesSetting={showHiddenFilesSetting}
      onClickFile={(path: string) => openFile(path)}
      onClickFolder={(path: string) => openFile(path, true)}
      onCreateFile={onCreateFile}
      onSelectBlockFile={onSelectBlockFile}
      openSidekickView={openSidekickView}
      pipeline={pipeline}
      ref={fileTreeRef}
      showError={showError}
      setSelectedBlock={setSelectedBlock}
      setShowHiddenFiles={toggleShowHiddenFiles}
      showHiddenFiles={showHiddenFiles}
      uuid={uuid}
      widgets={widgets}
    />
  ), [
    addNewBlock,
    blocks,
    deleteWidget,
    disableContextMenu,
    fetchAutocompleteItems,
    fetchFiles,
    fetchPipeline,
    fileTreeRef,
    files,
    showHiddenFilesSetting,
    onCreateFile,
    onSelectBlockFile,
    openFile,
    openSidekickView,
    pipeline,
    setSelectedBlock,
    showError,
    showHiddenFiles,
    toggleShowHiddenFiles,
    uuid,
    widgets,
  ]);

  const controller = useMemo(() => (
    <Controller
      addNewBlock={addNewBlock}
      disableRefreshWarning
      fetchPipeline={fetchPipeline}
      fetchVariables={fetchVariables}
      onUpdateFileSuccess={onUpdateFileSuccess}
      openFilePaths={openFilePaths}
      openSidekickView={openSidekickView}
      pipeline={pipeline}
      saveFile={saveFile}
      selectedFilePath={selectedFilePath}
      sendTerminalMessage={sendTerminalMessage}
      setContentByFilePath={setContentByFilePath}
      setDisableShortcuts={setDisableShortcuts}
      setErrors={showError}
      setFilesTouched={setFilesTouched}
      setSelectedBlock={setSelectedBlock}
    />
  ), [
    addNewBlock,
    fetchPipeline,
    fetchVariables,
    onUpdateFileSuccess,
    openFilePaths,
    openSidekickView,
    pipeline,
    saveFile,
    selectedFilePath,
    sendTerminalMessage,
    setContentByFilePath,
    setDisableShortcuts,
    setFilesTouched,
    setSelectedBlock,
    showError,
  ]);

  const menuMemo = useMemo(() => (
    <FileEditorHeader
      fileVersionsVisible={fileVersionsVisible}
      onSave={() => {
        if (contentByFilePath?.current?.[selectedFilePath]?.length >= 1) {
          saveFile(contentByFilePath.current[selectedFilePath], {
            path: selectedFilePath,
          });
        }
      }}
      setFilesVersionsVisible={setFilesVersionsVisible}
    />
  ), [
    contentByFilePath,
    fileVersionsVisible,
    saveFile,
    selectedFilePath,
    setFilesVersionsVisible,
  ]);

  const fileTabsMemo = useMemo(() => (
    <FileTabs
      filePaths={openFilePaths}
      filesTouched={filesTouched}
      isSelectedFilePath={(filePath: string, selectedFilePath: string) => filePath === selectedFilePath}
      onClickTab={(filePath: string) => {
        setSelectedFilePath(filePath);

        if (onSelectFile) {
          onSelectFile?.(filePath);
        }
      }}
      onClickTabClose={(filePath: string) => removeOpenFilePath(filePath)}
      renderTabTitle={(filePath: string) => {
        const filename = getFilenameFromFilePath(filePath);
        const arr = openFilenameMapping[filename];
        if (arr && arr?.length >= 2) {
          return filePath;
        }

        return filename;
      }}
      selectedFilePath={selectedFilePath}
    />
  ), [
    filesTouched,
    onSelectFile,
    openFilePaths,
    openFilenameMapping,
    removeOpenFilePath,
    selectedFilePath,
  ]);

  const fileVersionsMemo = useMemo(() => (
    <ApiReloader uuid={`FileVersions/${selectedFilePath
        ? decodeURIComponent(selectedFilePath)
        : ''
      }`
    }>
      <FileVersions
        selectedFilePath={selectedFilePath}
        setErrors={showError}
      />
    </ApiReloader>
  ), [
    selectedFilePath,
    showError,
  ]);

  return {
    browser: fileBrowserMemo,
    controller,
    fetchFiles,
    filePaths: openFilePaths,
    files,
    filesTouched,
    menu: menuMemo,
    openFile,
    selectedFilePath,
    tabs: fileTabsMemo,
    versions: fileVersionsMemo,
    versionsVisible: fileVersionsVisible,
  };
}

export default useFileComponents;
