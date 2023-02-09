import React, { useMemo, useState } from 'react';
import { useMutation } from 'react-query';

import BlockRunsTable from '@components/PipelineDetail/BlockRuns/Table';
import BlockRunType from '@interfaces/BlockRunType';
import Button from '@oracle/elements/Button';
import Divider from '@oracle/elements/Divider';
import Headline from '@oracle/elements/Headline';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import PipelineType from '@interfaces/PipelineType';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import buildTableSidekick from '@components/PipelineDetail/BlockRuns/buildTableSidekick';
import { OutputType } from '@interfaces/BlockType';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';

const MAX_COLUMNS = 40;

type PipelineBlockRunsProps = {
  pipeline: PipelineType;
  pipelineRun: PipelineRunType;
};

function PipelineBlockRuns({
  pipeline: pipelineProp,
  pipelineRun: pipelineRunProp,
}: PipelineBlockRunsProps) {
  const [selectedRun, setSelectedRun] = useState<BlockRunType>();

  const pipelineUUID = pipelineProp.uuid;
  const { data: dataPipeline } = api.pipelines.detail(pipelineUUID, {
    includes_content: false,
    includes_outputs: false,
  }, {
    revalidateOnFocus: false,
  });
  const pipeline = useMemo(() => ({
    ...dataPipeline?.pipeline,
    uuid: pipelineUUID,
  }), [
    dataPipeline,
    pipelineUUID,
  ]);

  const { data: dataPipelineRun } = api.pipeline_runs.detail(
    pipelineRunProp.id,
    {},
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    },
  );
  const pipelineRun = useMemo(
    () => dataPipelineRun?.pipeline_run,
    [dataPipelineRun],
  );

  const [updatePipelineRun, { isLoading: isLoadingUpdatePipelineRun }] = useMutation(
    api.pipeline_runs.useUpdate(pipelineRun?.id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
        },
      ),
    },
  );

  // @ts-ignore
  const retryBlocks = () => updatePipelineRun({
    pipeline_run: {
      'action': 'retry_blocks',
    },
  });

  const {
    data: dataOutput,
    loading: loadingOutput,
    mutate: fetchOutput,
  } = api.outputs.block_runs.list(selectedRun?.id);

  const {
    sample_data: blockSampleData,
    text_data: textData,
    type: dataType,
  }: OutputType = dataOutput?.outputs?.[0] || {};

  const blockRuns = useMemo(() => pipelineRun?.block_runs, [pipelineRun]);

  const columns = (blockSampleData?.columns || []).slice(0, MAX_COLUMNS);
  const rows = blockSampleData?.rows || [];

  const tableBlockRuns = useMemo(() => (
    <BlockRunsTable
      blockRuns={blockRuns}
      onClickRow={(rowIndex: number) => setSelectedRun((prev) => {
        const run = blockRuns[rowIndex];

        return prev?.id !== run.id ? run : null;
      })}
      pipeline={pipeline}
      selectedRun={selectedRun}
    />
  ), [
    blockRuns,
    pipeline,
    selectedRun,
  ]);

  return (
    <PipelineDetailPage
      breadcrumbs={[
        {
          label: () => 'Runs',
          linkProps: {
            as: `/pipelines/${pipelineUUID}/runs`,
            href: '/pipelines/[pipeline]/runs',
          },
        },
        {
          label: () => pipelineRun?.execution_date,
        },
      ]}
      buildSidekick={props => buildTableSidekick({
        ...props,
        blockRuns,
        columns,
        dataType,
        loadingData: loadingOutput,
        rows,
        selectedRun,
        showDynamicBlocks: true,
        textData,
      })}
      pageName={PageNameEnum.RUNS}
      pipeline={pipeline}
      subheader={pipelineRun?.status && pipelineRun.status !== RunStatus.COMPLETED && (
        <Button
          danger
          loading={isLoadingUpdatePipelineRun}
          onClick={(e) => {
            pauseEvent(e);
            retryBlocks();
          }}
          outline
        >
          Retry incomplete blocks
        </Button>
      )}
      title={({ name }) => `${name} runs`}
      uuid={`${PageNameEnum.RUNS}_${pipelineUUID}_${pipelineRun?.id}`}
    >
      <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
        <Headline level={5}>
          Block runs
        </Headline>
      </Spacing>

      <Divider light mt={PADDING_UNITS} short />
      {tableBlockRuns}
    </PipelineDetailPage>
  );
}

PipelineBlockRuns.getInitialProps = async (ctx: any) => {
  const {
    pipeline: pipelineUUID,
    run: pipelineRunId,
  }: {
    pipeline: string,
    run: number,
  } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
    pipelineRun: {
      id: pipelineRunId,
    },
  };
};

export default PrivateRoute(PipelineBlockRuns);
