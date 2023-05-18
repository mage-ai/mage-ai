import { useCallback, useMemo, useRef } from 'react';

import Dashboard from '@components/Dashboard';
import FileBrowser from '@components/FileBrowser';
import PrivateRoute from '@components/shared/PrivateRoute';
import api from '@api';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl } from '@utils/url';

function FilesPage() {
  const fileTreeRef = useRef(null);

  const { data: filesData, mutate: fetchFileTree } = api.files.list();
  const files = useMemo(() => filesData?.files || [], [filesData]);

  const openFile = useCallback((filePath: string) => {
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

  return (
    <Dashboard
      title="Files"
      uuid="Files/index"
    >
      <FileBrowser
        fetchFileTree={fetchFileTree}
        files={files}
        // onSelectBlockFile={onSelectBlockFile}
        openFile={openFile}
        ref={fileTreeRef}
        // setErrors={setErrors}
        // setSelectedBlock={setSelectedBlock}
        // widgets={widgets}
      />
    </Dashboard>
  );
}

FilesPage.getInitialProps = async () => ({});

export default PrivateRoute(FilesPage);
