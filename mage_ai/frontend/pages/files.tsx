import { useMemo } from 'react';

import Dashboard from '@components/Dashboard';
import FileBrowser from '@components/FileBrowser';
import PrivateRoute from '@components/shared/PrivateRoute';
import api from '@api';

function FilesPage() {
  const { data: filesData, mutate: fetchFileTree } = api.files.list();
  const files = useMemo(() => filesData?.files || [], [filesData]);

  return (
    <Dashboard
      title="Files"
      uuid="Files/index"
    >
      <FileBrowser
        // addNewBlock={(
        //   b: BlockRequestPayloadType,
        //   cb: (block: BlockType) => void,
        // ) => {
        //   addNewBlockAtIndex(
        //     b,
        //     blocks.length,
        //     cb,
        //     b.name,
        //   );
        //   if (filePathsFromUrl?.length >= 1) {
        //     router.push(`/pipelines/${pipelineUUID}/edit`);
        //   }
        // }}
        // blocks={blocks}
        // // deleteBlockFile={deleteBlockFile}
        // deleteWidget={deleteWidget}
        // fetchAutocompleteItems={fetchAutocompleteItems}
        // fetchFileTree={fetchFileTree}
        // fetchPipeline={fetchPipeline}
        files={files}
        // onSelectBlockFile={onSelectBlockFile}
        // openFile={openFile}
        // openPipeline={(uuid: string) => {
        //   resetState();
        //   router.push('/pipelines/[pipeline]/edit', `/pipelines/${uuid}/edit`);
        // }}
        // openSidekickView={openSidekickView}
        // pipeline={pipeline}
        // ref={fileTreeRef}
        // setErrors={setErrors}
        // setSelectedBlock={setSelectedBlock}
        // widgets={widgets}
      />
    </Dashboard>
  );
}

FilesPage.getInitialProps = async () => ({});

export default PrivateRoute(FilesPage);
