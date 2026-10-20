import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ApiReloader from '@components/ApiReloader';
import ErrorsType from '@interfaces/ErrorsType';
import FileBrowser from '@components/FileBrowser';
import FileEditor from '@components/FileEditor';
import FileTabs from '@components/PipelineDetail/FileTabs';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import WorkspacesDashboard from '@components/workspaces/Dashboard';
import api from '@api';
import { equals } from '@utils/array';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl } from '@utils/url';
import { PipelineHeaderStyle } from '@components/PipelineDetail/index.style';
import { WorkspacesPageNameEnum } from '@components/workspaces/Dashboard/constants';
import FileType from '@interfaces/FileType';


function FilesPage() {
  const [errors, setErrors] = useState<ErrorsType>(null);

  const qUrl = queryFromUrl();
  const {
    file_path: filePathFromUrl,
  } = qUrl;

  const filePathsFromUrl = useMemo(() => {
    let arr = qUrl['file_paths[]'] || [];
    if (!Array.isArray(arr)) {
      arr = [arr];
    }
    return arr;
  }, [qUrl]);

  const openFile = useCallback((filePath: string, file: FileType) => {
    const filePathEncoded = encodeURIComponent(filePath);
    let filePaths = queryFromUrl()['file_paths[]'] || [];
    if (!Array.isArray(filePaths)) {
      filePaths = [filePaths];
    }
    if (!filePaths.includes(filePathEncoded)) {
      filePaths.push(filePathEncoded);
    }

    goToWithQuery({
      file_path: filePathEncoded,
      'file_paths[]': filePaths,
    });
  }, []);

  const { data: filesData, mutate: fetchFileTree } = api.files.list();
  const files = useMemo(() => filesData?.files || [], [filesData]);
  const fileTreeRef = useRef(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string>(null);
  const [selectedFilePaths, setSelectedFilePaths] = useState<string[]>([]);
  const [filesTouched, setFilesTouched] = useState<{
    [filePath: string]: boolean;
  }>({});

  const before = useMemo(() => (
    <Spacing ml={1} mt={1}>
      <FileBrowser
        fetchFiles={fetchFileTree}
        files={files}
        openFile={openFile}
        ref={fileTreeRef}
        showError={setErrors}
        uuid="pages/manage/files"
      />
    </Spacing>
  ), [
    fetchFileTree,
    files,
    openFile,
    setErrors,
  ]);

  useEffect(() => {
    setSelectedFilePath(filePathFromUrl);
  }, [
    filePathFromUrl,
  ]);
  useEffect(() => {
    if (!equals(filePathsFromUrl, selectedFilePaths)) {
      setSelectedFilePaths(filePathsFromUrl);
    }
  }, [
    filePathsFromUrl,
    selectedFilePaths,
  ]);

  return (
    <WorkspacesDashboard
      before={before}
      breadcrumbs={[
        {
          label: () => 'Workspaces',
          linkProps: {
            as: '/manage',
            href: '/manage',
          },
        },
        {
          bold: true,
          label: () => 'File browser',
        },
      ]}
      errors={errors}
      mainContainerHeader={
        <PipelineHeaderStyle secondary>
          <FileTabs
            filePaths={selectedFilePaths}
            filesTouched={filesTouched}
            selectedFilePath={selectedFilePath}
          />
        </PipelineHeaderStyle>
      }
      pageName={WorkspacesPageNameEnum.FILE_BROWSER}
    >
      {filePathsFromUrl?.map((filePath: string) => (
        <div
          key={filePath}
          style={{
              display: selectedFilePath === filePath
              ? null
              : 'none',
          }}
        >
          <ApiReloader uuid={`manage/FileEditor/${decodeURIComponent(filePath)}`}>
            <FileEditor
              active={selectedFilePath === filePath}
              filePath={filePath}
              selectedFilePath={selectedFilePath}
              setErrors={setErrors}
              setFilesTouched={setFilesTouched}
            />
          </ApiReloader>
        </div>
    ))}
    </WorkspacesDashboard>
  );
}

FilesPage.getInitialProps = async () => ({});

export default PrivateRoute(FilesPage);
