import { useEffect, useState } from 'react';
import { useMutation } from 'react-query';

import InteractionType from '@interfaces/InteractionType';
import PipelineInteractionType from '@interfaces/PipelineInteractionType';
import PipelineInteractions from '@components/PipelineInteractions';
import api from '@api';
import { ErrorProvider } from '@context/Error';
import { onSuccess } from '@api/utils/response';
import { useModal } from '@context/Modal';

function Test() {
  const [selectedBlockUUID, setSelectedBlockUUID] = useState<string>(null);

  // const blockUUID = 'source_pg_python';
  // const blockUUID = 'source_pg_yaml';
  // const blockUUID = 'destination_pg_yaml';
  const pipelineUUID = 'interactions_testing';

  const {
    data: dataPipeline,
    // mutate: fetchPipeline,
  } = api.pipelines.detail(
    pipelineUUID,
    {
      include_block_pipelines: true,
      includes_outputs: true,
    },
  );

  const {
    data: dataPipelineInteraction,
    // mutate: fetchPipeline,
  } = api.pipeline_interactions.detail(
    pipelineUUID,
    // {
    //   include_block_pipelines: true,
    //   includes_outputs: true,
    // },
  );

  const {
    data: dataInteractions,
    // mutate: fetchPipeline,
  } = api.interactions.pipeline_interactions.list(
    pipelineUUID,
    // {
    //   include_block_pipelines: true,
    //   includes_outputs: true,
    // },
  );

  const pipeline = dataPipeline?.pipeline;
  const pipelineInteraction: PipelineInteractionType = dataPipelineInteraction?.pipeline_interaction;
  const interactions: InteractionType = dataInteractions?.interactions

  // const block = pipeline?.blocks?.find(({ uuid }) => blockUUID === uuid);

  // const [updatePipeline, { isLoading: isPipelineUpdating }] = useMutation(
  //   api.pipelines.useUpdate(pipelineUUID, { update_content: true }),
  //   {
  //     onSuccess: (response: any) => onSuccess(
  //       response, {
  //         callback: () => {

  //         },
  //       },
  //     ),
  //   },
  // );

  // const [showModal, hideModal] = useModal(() => (
  //   <ErrorProvider>
  //     <DataIntegrationModal
  //       block={block}
  //       onClose={hideModal}
  //       pipeline={pipeline}
  //     />
  //   </ErrorProvider>
  // ), {}, [
  //   block,
  //   blockUUID,
  //   pipeline,
  // ], {
  //   background: true,
  //   disableClickOutside: true,
  //   disableCloseButton: true,
  //   disableEscape: true,
  //   uuid: `DataIntegrationModal/${blockUUID}`,
  // });

  // useEffect(() => {
  //   if (block) {
  //     showModal();
  //   }
  // }, [
  //   block,
  //   pipeline,
  //   showModal,
  // ]);

  return (
    <div>
      <PipelineInteractions
        interactions={interactions}
        pipeline={pipeline}
        pipelineInteraction={pipelineInteraction}
        selectedBlockUUID={selectedBlockUUID}
        setSelectedBlockUUID={setSelectedBlockUUID}
      />
    </div>
  );
}

export default Test;
