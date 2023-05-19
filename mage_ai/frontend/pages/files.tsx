import { useCallback, useMemo, useRef } from 'react';

import Dashboard from '@components/Dashboard';
import FileBrowser from '@components/FileBrowser';
import PrivateRoute from '@components/shared/PrivateRoute';
import api from '@api';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl } from '@utils/url';
import { useError } from '@context/Error';

function FilesPage() {
  const fileTreeRef = useRef(null);

  const { data: filesData, mutate: fetchFileTree } = api.files.list();
  const files = useMemo(() => filesData?.files || [], [filesData]);

  const openFile = useCallback((filePath: string, isFolder: boolean) => {
    console.log(filePath, isFolder);

    // Use local storage to keep track
  }, []);

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

  return (
    <Dashboard
      title="Files"
      uuid="Files/index"
    >
      <FileBrowser
        fetchFileTree={fetchFileTree}
        files={files}
        onClickFile={(path: string) => openFile(path)}
        onClickFolder={(path: string) => openFile(path, true)}
        ref={fileTreeRef}
      />
    </Dashboard>
  );
}

FilesPage.getInitialProps = async () => ({});

export default PrivateRoute(FilesPage);
