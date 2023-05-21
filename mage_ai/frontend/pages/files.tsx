import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Dashboard from '@components/Dashboard';
import FileBrowser from '@components/FileBrowser';
import PrivateRoute from '@components/shared/PrivateRoute';
import api from '@api';
import FileTabs from '@components/PipelineDetail/FileTabs';
import {
  addOpenFilePath as addOpenFilePathLocalStorage,
  getOpenFilePaths,
  removeOpenFilePath as removeOpenFilePathLocalStorage,
  setOpenFilePaths as setOpenFilePathsLocalStorage,
} from '@storage/files';
import { useError } from '@context/Error';

function FilesPage() {
  const fileTreeRef = useRef(null);
  const [openFilePaths, setOpenFilePathsState] = useState<string[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>(null);

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
      // filesTouched={filesTouched}
      isSelectedFilePath={(filePath: string, selectedFilePath: string) => filePath === selectedFilePath}
      onClickTab={(filePath: string) => setSelectedFilePath(filePath)}
      onClickTabClose={(filePath: string) => removeOpenFilePath(filePath)}
      selectedFilePath={selectedFilePath}
    />
  ), [
    openFilePaths,
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

  return (
    <Dashboard
      title="Files"
      uuid="Files/index"
    >
      {fileTabsMemo}
      {fileBrowserMemo}
    </Dashboard>
  );
}

FilesPage.getInitialProps = async () => ({});

export default PrivateRoute(FilesPage);
