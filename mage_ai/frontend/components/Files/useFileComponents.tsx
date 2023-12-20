import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGlobalState } from '@storage/state';
import { useMutation } from 'react-query';

import ApiReloader from '@components/ApiReloader';
import Controller from '@components/FileEditor/Controller';
import Dashboard from '@components/Dashboard';
import FileBrowser from '@components/FileBrowser';
import FileEditorHeader from '@components/FileEditor/Header';
import FileTabs from '@components/PipelineDetail/FileTabs';
import FileType from '@interfaces/FileType';
import FileVersions from '@components/FileVersions';
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
import {
  addOpenFilePath as addOpenFilePathLocalStorage,
  getOpenFilePaths,
  removeOpenFilePath as removeOpenFilePathLocalStorage,
  setOpenFilePaths as setOpenFilePathsLocalStorage,
} from '@storage/files';
import { getFilenameFromFilePath } from './utils';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { useError } from '@context/Error';
import { useKeyboardContext } from '@context/Keyboard';

function useFileComponents({
  addNewBlock,
  blocks,
  deleteWidget,
  fetchAutocompleteItems,
  fetchPipeline,
  onOpenFile,
  onSelectBlockFile,
  onSelectFile,
  openSidekickView,
  pipeline,
  selectedFilePath: selectedFilePathDefault,
  setSelectedBlock,
  tabsBefore,
  widgets,
} = {}) {
  const [, setApiReloads] = useGlobalState('apiReloads');
  const [showError] = useError(null, {}, [], {
    uuid: 'FilesPage',
  });

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
    setOpenFilePaths(arr);
    setSelectedFilePath(selectedFilePathDefault ? selectedFilePathDefault : prev => {
      if (!prev && arr?.length >= 1) {
        return arr[0];
      }

      return prev;
    });
  }, [
    selectedFilePathDefault,
    setOpenFilePaths,
  ]);

  const { data: filesData, mutate: fetchFiles } = api.files.list();
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
      fetchAutocompleteItems={fetchAutocompleteItems}
      fetchFiles={fetchFiles}
      fetchPipeline={fetchPipeline}
      files={files}
      onClickFile={(path: string) => openFile(path)}
      onClickFolder={(path: string) => openFile(path, true)}
      onSelectBlockFile={onSelectBlockFile}
      openSidekickView={openSidekickView}
      pipeline={pipeline}
      ref={fileTreeRef}
      setErrors={showError}
      setSelectedBlock={setSelectedBlock}
      widgets={widgets}
    />
  ), [
    addNewBlock,
    blocks,
    deleteWidget,
    fetchAutocompleteItems,
    fetchFiles,
    fetchPipeline,
    fileTreeRef,
    files,
    onSelectBlockFile,
    openFile,
    openSidekickView,
    pipeline,
    setSelectedBlock,
    showError,
    widgets,
  ]);

  const controller = useMemo(() => (
    <Controller
      disableRefreshWarning
      openFilePaths={openFilePaths}
      saveFile={saveFile}
      selectedFilePath={selectedFilePath}
      setContentByFilePath={setContentByFilePath}
      setErrors={showError}
      setFilesTouched={setFilesTouched}
    />
  ), [
    openFilePaths,
    saveFile,
    selectedFilePath,
    setContentByFilePath,
    setFilesTouched,
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
      tabsBefore={tabsBefore}
    />
  ), [
    filesTouched,
    onSelectFile,
    openFilePaths,
    openFilenameMapping,
    removeOpenFilePath,
    selectedFilePath,
    tabsBefore,
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
