import moment from 'moment-timezone';
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
  OriginalContentMappingType,
} from '@interfaces/FileType';
import FileVersions from '@components/FileVersions';
import PipelineType from '@interfaces/PipelineType';
import StatusFooter from '@components/PipelineDetail/StatusFooter';
import api from '@api';
import {
  HeaderStyle,
  MAIN_CONTENT_TOP_OFFSET,
  MenuStyle,
  TabsStyle,
} from './index.style';
import { DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET } from '@utils/date';
import {
  KEY_CODE_ARROW_LEFT,
  KEY_CODE_ARROW_RIGHT,
  KEY_CODE_CONTROL,
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
import { Edit, Save, VisibleEye } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { displayPipelineLastSaved } from '@components/PipelineDetail/utils';
import { get, set } from '@storage/localStorage';
import { getFilenameFromFilePath } from './utils';
import { keysPresentAndKeysRecent } from '@utils/hooks/keyboardShortcuts/utils';
import { indexBy } from '@utils/array';
import { onSuccess } from '@api/utils/response';
import { onlyKeysPresent } from '@utils/hooks/keyboardShortcuts/utils';
import { useError } from '@context/Error';
import { useKeyboardContext } from '@context/Keyboard';

export const ICON_SIZE = UNIT * 2;
export const MENU_ICON_SIZE = UNIT * 1.5;
const MENU_ICON_PROPS = {
  default: true,
  size: MENU_ICON_SIZE,
};

type UseFileComponentsProps = {
  addNewBlock?: (
    b: BlockRequestPayloadType,
    cb: (block: BlockType) => void,
    opts?: {
      disableFetchingFiles?: boolean;
    },
  ) => void;
  blocks?: BlockType[];
  contained?: boolean;
  containerRef?: any;
  deleteWidget?: (value: BlockType) => void;
  disableContextMenu?: boolean;
  fetchAutocompleteItems?: () => void;
  fetchPipeline?: () => void;
  fetchVariables?: () => void;
  codeEditorMaximumHeightOffset?: number;
  onClickTabClose?: (filePath: string) => void;
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
  originalContent?: OriginalContentMappingType;
  pipeline?: PipelineType;
  query?: {
    pattern?: string;
  };
  selectedFilePath?: string;
  sendTerminalMessage?: (message: string, keep?: boolean) => void;
  setDisableShortcuts?: (disableShortcuts: boolean) => void;
  setSelectedBlock?: (value: BlockType) => void;
  showHiddenFilesSetting?: boolean;
  uuid: string;
  widgets?: BlockType[];
};

function useFileComponents({
  addNewBlock,
  blocks,
  contained,
  containerRef,
  deleteWidget,
  disableContextMenu,
  fetchAutocompleteItems,
  fetchPipeline,
  fetchVariables,
  codeEditorMaximumHeightOffset,
  onClickTabClose,
  onCreateFile,
  onOpenFile,
  onSelectBlockFile,
  onSelectFile,
  onUpdateFileSuccess,
  openSidekickView,
  originalContent,
  pipeline,
  query,
  selectedFilePath: selectedFilePathDefault,
  sendTerminalMessage,
  setDisableShortcuts,
  setSelectedBlock,
  showHiddenFilesSetting,
  uuid: uuidProp,
  widgets,
}: UseFileComponentsProps = {
  uuid: null,
}) {
  const uuid = useMemo(() => `useFileComponents/${uuidProp}`, [uuidProp]);
  const [, setApiReloads] = useGlobalState('apiReloads');
  const [showError] = useError(null, {}, [], {
    uuid,
  });
  const [showHiddenFiles, setShowHiddenFiles] = useState<boolean>(
    get(LOCAL_STORAGE_KEY_SHOW_HIDDEN_FILES, false),
  );

  const fileTreeRef = useRef(null);
  const contentByFilePath = useRef(null);

  const [lastSavedMapping, setSLastSavedMapping] = useState<{
    [filePath: string]: number;
  }>({});
  const [contentTouchedMapping, setContentTouchedMapping] = useState<{
    [filePath: string]: number;
  }>({});

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

    setContentTouchedMapping(prev => ({
      ...prev,
      ...data,
    }));
  }, [contentByFilePath]);

  const [filesMapping, setFilesMapping] = useState<{
    [filePath: string]: FileType;
  }>({});
  const [openFilePaths, setOpenFilePathsState] = useState<string[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>(null);
  const [filesTouched, setFilesTouched] = useState<{
    [filePath: string]: boolean;
  }>({});
  const [fileVersionsVisible, setFilesVersionsVisible] = useState<boolean>(false);
  const selectedFile = useMemo(() => filesMapping?.[selectedFilePath], [
    filesMapping,
    selectedFilePath,
  ]);

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

  const onFileFetched = useCallback((file: FileType) => {
    setFilesMapping(prev => ({
      ...prev,
      [file.path]: file,
    }));
  }, []);

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

  const {
    disableGlobalKeyboardShortcuts,
    registerOnKeyDown,
    unregisterOnKeyDown,
  } = useKeyboardContext();

  useEffect(() => () => {
    unregisterOnKeyDown(uuid);
  }, [unregisterOnKeyDown, uuid]);

  registerOnKeyDown(uuid, (event, keyMapping, keyHistory) => {
    const filenamesTouched =
      Object.entries(filesTouched).reduce((acc, [k, v]) => v ? acc.concat(k) : acc, []);

    if (onlyKeysPresent([KEY_CODE_META, KEY_CODE_R], keyMapping) && filenamesTouched?.length >= 1) {
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
    } else if (
      keysPresentAndKeysRecent([KEY_CODE_META, KEY_CODE_CONTROL], [KEY_CODE_ARROW_LEFT], keyMapping, keyHistory)
      || keysPresentAndKeysRecent([KEY_CODE_META, KEY_CODE_CONTROL], [KEY_CODE_ARROW_RIGHT], keyMapping, keyHistory)
    ) {
      const numberOfFilePaths = openFilePaths?.length || 0;
      let idx = openFilePaths?.findIndex((filePath: string) => selectedFilePath === filePath);

      if (KEY_CODE_ARROW_LEFT === keyHistory[0]) {
        idx -= 1;
      } else if (KEY_CODE_ARROW_RIGHT === keyHistory[0]) {
        idx += 1;
      }

      if (idx < 0) {
        idx = numberOfFilePaths - 1;
      } else if (idx > numberOfFilePaths - 1) {
        idx = 0;
      }

      setSelectedFilePath(openFilePaths[idx]);
    }

    if (disableGlobalKeyboardShortcuts) {
      return;
    }
  },
  [
    filesTouched,
    openFilePaths,
    selectedFilePath,
    setSelectedFilePath,
  ]);

  const [updateFile, { isLoadingUpdate }] = useMutation(
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
            setSLastSavedMapping({
              [file?.path]: moment().utc().unix(),
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

  const saveStatus: string = useMemo(() => displayPipelineLastSaved(
    {
      updated_at: selectedFile?.modified_timestamp
        ? (moment.unix(selectedFile?.modified_timestamp))?.format(DATE_FORMAT_LONG_NO_SEC_WITH_OFFSET)
        : null,
      uuid: selectedFile?.path,
    },
    {
      displayRelative: true,
      isPipelineUpdating: isLoadingUpdate,
      pipelineContentTouched: contentTouchedMapping?.[selectedFilePath],
      pipelineLastSaved: lastSavedMapping?.[selectedFilePath],
      showLastUpdatedTimestamp: selectedFile?.modified_timestamp * 1000,
    },
  ), [
    contentTouchedMapping,
    isLoadingUpdate,
    lastSavedMapping,
    selectedFile,
    selectedFilePath,
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
      onClickFile={(path: string) => openFile(path)}
      onClickFolder={(path: string) => openFile(path, true)}
      onCreateFile={onCreateFile}
      onSelectBlockFile={onSelectBlockFile}
      openSidekickView={openSidekickView}
      pipeline={pipeline}
      ref={fileTreeRef}
      showError={showError}
      setSelectedBlock={setSelectedBlock}
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
      contained={contained}
      containerRef={containerRef}
      disableRefreshWarning
      fetchPipeline={fetchPipeline}
      fetchVariables={fetchVariables}
      codeEditorMaximumHeightOffset={codeEditorMaximumHeightOffset}
      onFileFetched={onFileFetched}
      onUpdateFileSuccess={onUpdateFileSuccess}
      openFilePaths={openFilePaths}
      openSidekickView={openSidekickView}
      originalContent={originalContent}
      pipeline={pipeline}
      saveFile={saveFile}
      selectedFilePath={selectedFilePath}
      sendTerminalMessage={sendTerminalMessage}
      setContentByFilePath={setContentByFilePath}
      setDisableShortcuts={setDisableShortcuts}
      setErrors={showError}
      setFilesTouched={setFilesTouched}
      setSelectedBlock={setSelectedBlock}
      updateFile={updateFile}
    />
  ), [
    addNewBlock,
    codeEditorMaximumHeightOffset,
    contained,
    containerRef,
    fetchPipeline,
    fetchVariables,
    onFileFetched,
    onUpdateFileSuccess,
    openFilePaths,
    openSidekickView,
    originalContent,
    pipeline,
    saveFile,
    selectedFilePath,
    sendTerminalMessage,
    setContentByFilePath,
    setDisableShortcuts,
    setFilesTouched,
    setSelectedBlock,
    showError,
    updateFile,
  ]);

  const headerMenuGroups = useMemo(() => {
    return [
      {
        uuid: 'File',
        items: [
          {
            beforeIcon: <Save {...MENU_ICON_PROPS} />,
            uuid: 'Save file and and all changes',
            onClick: (opts) => {
              if (contentByFilePath?.current?.[selectedFilePath]?.length >= 1) {
                saveFile(contentByFilePath.current[selectedFilePath], {
                  path: selectedFilePath,
                });
              }
            },
          },
        ],
      },
      {
        uuid: 'Edit',
        items: [
          {
            beforeIcon: <Edit success={fileVersionsVisible} {...MENU_ICON_PROPS} />,
            uuid: 'Show previous file versions to undo changes',
            disabled: fileVersionsVisible,
            onClick: () => {
              setFilesVersionsVisible(true);
            },
          },
          {
            beforeIcon: <Edit {...MENU_ICON_PROPS} />,
            uuid: 'Close file versions',
            disabled: !Edit,
            onClick: () => {
              setFilesVersionsVisible(false);
            },
          },
        ],
      },
      {
        uuid: 'View',
        items: [
          {
            beforeIcon: <VisibleEye success={showHiddenFiles} {...MENU_ICON_PROPS} />,
            uuid: 'Show hidden files',
            disabled: showHiddenFiles,
            onClick: () => {
              setShowHiddenFiles(true);
            },
          },
          {
            beforeIcon: <VisibleEye {...MENU_ICON_PROPS} />,
            uuid: 'Hide hidden files',
            disabled: !showHiddenFiles,
            onClick: () => {
              setShowHiddenFiles(false);
            },
          },
        ],
      },
    ];
  }, [
    contentByFilePath,
    saveFile,
    selectedFilePath,
    setShowHiddenFiles,
    showHiddenFiles,
  ]);

  const menuMemo = useMemo(() => (
    <FileEditorHeader
      menuGroups={headerMenuGroups}
    />
  ), [
    headerMenuGroups,
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
      onClickTabClose={(filePath: string) => {
        removeOpenFilePath(filePath);
        if (onClickTabClose) {
          onClickTabClose?.(filePath);
        }
      }}
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
    onClickTabClose,
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

  const footerMemo = useMemo(() => {
    return (
      <StatusFooter
        inline
        pipelineContentTouched={contentTouchedMapping?.[selectedFilePath]}
        pipelineLastSaved={lastSavedMapping?.[selectedFilePath]}
        saveStatus={saveStatus}
      />
    );
  }, [
    contentTouchedMapping,
    lastSavedMapping,
    saveStatus,
    selectedFilePath,
  ]);

  return {
    browser: fileBrowserMemo,
    controller,
    fetchFiles,
    filePaths: openFilePaths,
    files,
    filesTouched,
    footer: footerMemo,
    menu: menuMemo,
    openFile,
    selectedFilePath,
    tabs: fileTabsMemo,
    versions: fileVersionsMemo,
    versionsVisible: fileVersionsVisible,
  };
}

export default useFileComponents;
