import { useEffect } from 'react';
import { useMutation } from 'react-query';

import DataIntegrationModal from '@components/DataIntegrationModal';
import api from '@api';
import { ErrorProvider } from '@context/Error';
import { onSuccess } from '@api/utils/response';
import { useModal } from '@context/Modal';

function Test() {
  // const blockUUID = 'source_pg_python';
  // const blockUUID = 'source_pg_yaml';
  const blockUUID = 'destination_pg_yaml';
  const pipelineUUID = 'data_integration_blocks_client';
  const {
    data,
    mutate: fetchPipeline,
  } = api.pipelines.detail(
    pipelineUUID,
    {
      include_block_pipelines: true,
      includes_outputs: true,
    },
  );
  const pipeline = data?.pipeline;
  const block = pipeline?.blocks?.find(({ uuid }) => blockUUID === uuid);

  const [updatePipeline, { isLoading: isPipelineUpdating }] = useMutation(
    api.pipelines.useUpdate(pipelineUUID, { update_content: true }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {

          },
        },
      ),
    },
  );

  const [showModal, hideModal] = useModal(() => (
    <ErrorProvider>
      <DataIntegrationModal
        block={block}
        onClose={hideModal}
        pipeline={pipeline}
      />
    </ErrorProvider>
  ), {}, [
    block,
    blockUUID,
    pipeline,
  ], {
    background: true,
    disableClickOutside: true,
    disableCloseButton: true,
    disableEscape: true,
    uuid: `DataIntegrationModal/${blockUUID}`,
  });

  useEffect(() => {
    if (block) {
      showModal();
    }
  }, [
    block,
    pipeline,
    showModal,
  ]);

  return (
    <div>
    </div>
  );
}

export default Test;
