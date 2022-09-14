import React, { useMemo, useState } from 'react';

import BlockRunsTable from '@components/PipelineDetail/BlockRuns/Table';
import BlockRunType from '@interfaces/BlockRunType';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunType from '@interfaces/PipelineRunType';
import PipelineType from '@interfaces/PipelineType';
import api from '@api';
import buildTableSidekick from '@components/PipelineDetail/BlockRuns/buildTableSidekick';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';

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
  const { data: dataPipeline } = api.pipelines.detail(pipelineUUID);
  const pipeline = useMemo(() => ({
    ...dataPipeline?.pipeline,
    uuid: pipelineUUID,
  }), [
    dataPipeline,
    pipelineUUID,
  ]);

  const { data: dataPipelineRun } = api.pipeline_runs.detail(pipelineRunProp.id);
  const pipelineRun = useMemo(
    () => dataPipelineRun?.pipeline_run, 
    [dataPipelineRun],
  );

  const {
    data: dataOutput,
    loading: loadingOutput,
    mutate: fetchOutput,
  } = api.outputs.block_runs.list(selectedRun?.id);

  console.log('data output:', dataOutput);

  const {
    sample_data: blockSampleData
  } = dataOutput?.outputs?.[0] || {};

  const blockRuns = useMemo(() => pipelineRun?.block_runs, [pipelineRun]);

  const columns = (blockSampleData?.columns || []).slice(0, MAX_COLUMNS);
  const rows = blockSampleData?.rows || [];

  const tableBlockRuns = useMemo(() => (
    <BlockRunsTable
      blockRuns={blockRuns}
      onClickRow={(rowIndex: number) => setSelectedRun((prev) => {
        const run = blockRuns[rowIndex];

        return prev?.id !== run.id ? run : null
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
      buildSidekick={props => buildTableSidekick({
        ...props,
        blockRuns,
        columns,
        loadingData: loadingOutput,
        rows,
        selectedRun,
      })}
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
      pageName={PageNameEnum.RUNS}
      pipeline={pipeline}
      title={({ name }) => `${name} runs`}
      uuid={`${PageNameEnum.RUNS}_${pipelineUUID}_${pipelineRun?.id}`}
    >
      {tableBlockRuns}
    </PipelineDetailPage>
  )
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

export default PipelineBlockRuns;
