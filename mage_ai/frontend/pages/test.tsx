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
  const pipelineUUID = 'interactions_testing';

  const {
    data: dataPipeline,
    mutate: fetchPipeline,
  } = api.pipelines.detail(
    pipelineUUID,
    {
      include_block_pipelines: true,
      includes_outputs: true,
    },
  );

  const {
    data: dataPipelineInteraction,
    mutate: fetchPipelineInteraction,
  } = api.pipeline_interactions.detail(pipelineUUID);

  const {
    data: dataInteractions,
    mutate: fetchInteractions,
  } = api.interactions.pipeline_interactions.list(pipelineUUID);

  const pipeline = dataPipeline?.pipeline;
  const pipelineInteraction: PipelineInteractionType = dataPipelineInteraction?.pipeline_interaction;
  const interactions: InteractionType = dataInteractions?.interactions

  const [
    updatePipelineInteraction,
    {
      isLoading: isLoadingUpdatePipelineInteraction,
    },
  ] = useMutation(
    api.pipeline_interactions.useUpdate(pipelineUUID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (resp) => {
            fetchPipelineInteraction();
          },
        },
      ),
    },
  );

  const [
    createInteraction,
    {
      isLoading: isLoadingCreateInteraction,
    },
  ] = useMutation(
    api.interactions.pipeline_interactions.useCreate(pipelineUUID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: (resp) => {
            fetchInteractions();
            fetchPipelineInteraction();
          },
        },
      ),
    },
  );

  return (
    <div>
      <PipelineInteractions
        createInteraction={(interaction: InteractionType) => createInteraction({
          interaction,
        })}
        interactions={interactions}
        isLoadingCreateInteraction={isLoadingCreateInteraction}
        isLoadingUpdatePipelineInteraction={isLoadingUpdatePipelineInteraction}
        pipeline={pipeline}
        pipelineInteraction={pipelineInteraction}
        updatePipelineInteraction={(
          pipelineInteraction: PipelineInteractionType,
         ) => updatePipelineInteraction({
          pipeline_interaction: pipelineInteraction,
        })}
      />
    </div>
  );
}

export default Test;
