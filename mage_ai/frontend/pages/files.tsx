import * as osPath from 'path';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ApiReloader from '@components/ApiReloader';
import Dashboard from '@components/Dashboard';
import FileBrowser from '@components/FileBrowser';
import FileEditor from '@components/FileEditor';
import FileTabs from '@components/PipelineDetail/FileTabs';
import PrivateRoute from '@components/shared/PrivateRoute';
import TripleLayout from '@components/TripleLayout';
import api from '@api';
import {
  addOpenFilePath as addOpenFilePathLocalStorage,
  getOpenFilePaths,
  removeOpenFilePath as removeOpenFilePathLocalStorage,
  setOpenFilePaths as setOpenFilePathsLocalStorage,
} from '@storage/files';
import { useError } from '@context/Error';

function getFilenameFromFilePath(filePath: string): string {
  const parts = filePath.split(osPath.sep);
  const filename = parts[parts.length - 1];
  return filename;
}

function FilesPage() {
  const fileTreeRef = useRef(null);
  const [openFilePaths, setOpenFilePathsState] = useState<string[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>(null);
  const [filesTouched, setFilesTouched] = useState<{
    [filePath: string]: boolean;
  }>({});

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
    const arr = removeOpenFilePathLocalStorage(filePath);
    setOpenFilePaths(arr);

    if (selectedFilePath === filePath && arr?.length >= 1) {
      setSelectedFilePath(arr[arr.length - 1]);
    }
  }, [
    selectedFilePath,
    setOpenFilePaths,
  ]);

  const openFile = useCallback((filePath: string, isFolder: boolean) => {
    if (!isFolder) {
      addOpenFilePath(filePath);
      setSelectedFilePath(filePath);
    }
  }, [addOpenFilePath]);

  useEffect(() => {
    const arr = getOpenFilePaths();
    setOpenFilePaths(arr);
    setSelectedFilePath(prev => {
      if (!prev && arr?.length >= 1) {
        return arr[0];
      }

      return prev;
    });
  }, [
    setOpenFilePaths,
  ]);

  const { data: filesData, mutate: fetchFileTree } = api.files.list();
  const files = useMemo(() => filesData?.files || [], [filesData]);

  // const [showError] = useError(null, {}, [], {
  //   uuid: 'FilesPage',
  // });
  // const [updateProjectBase, { isLoading: isLoadingUpdateProject }]: any = useMutation(
  //   api.projects.useUpdate(project?.name),
  //   {
  //     onSuccess: (response: any) => onSuccess(
  //       response, {
  //         callback: () => {
  //           fetchProjects();
  //         },
  //         onErrorCallback: (response, errors) => showError({
  //           errors,
  //           response,
  //         }),
  //       },
  //     ),
  //   },
  // );

  const fileTabsMemo = useMemo(() => (
    <FileTabs
      filePaths={openFilePaths}
      filesTouched={filesTouched}
      isSelectedFilePath={(filePath: string, selectedFilePath: string) => filePath === selectedFilePath}
      onClickTab={(filePath: string) => setSelectedFilePath(filePath)}
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
    openFilePaths,
    openFilenameMapping,
    removeOpenFilePath,
    selectedFilePath,
  ]);

  const fileBrowserMemo = useMemo(() => (
    <FileBrowser
      fetchFileTree={fetchFileTree}
      files={files}
      onClickFile={(path: string) => openFile(path)}
      onClickFolder={(path: string) => openFile(path, true)}
      ref={fileTreeRef}
    />
  ), [
    fetchFileTree,
    fileTreeRef,
    files,
    openFile,
  ]);

  const fileEditorMemo = useMemo(() => openFilePaths?.map((filePath: string) => (
    <div
      key={filePath}
      style={{
        display: selectedFilePath === filePath
          ? null
          : 'none',
      }}
    >
      <ApiReloader uuid={`FileEditor/${decodeURIComponent(filePath)}`}>
        <FileEditor
          active={selectedFilePath === filePath}
          filePath={filePath}
          // openSidekickView={openSidekickView}
          selectedFilePath={selectedFilePath}
          // sendTerminalMessage={sendTerminalMessage}
          // setDisableShortcuts={setDisableShortcuts}
          // setErrors={setErrors}
          setFilesTouched={setFilesTouched}
        />
      </ApiReloader>
    </div>
  )), [
    openFilePaths,
    selectedFilePath,
  ]);

  return (
    <Dashboard
      title="Files"
      uuid="Files/index"
    >
      {fileTabsMemo}
      {fileEditorMemo}
      {fileBrowserMemo}
    </Dashboard>
  );
}

FilesPage.getInitialProps = async () => ({});

export default PrivateRoute(FilesPage);
