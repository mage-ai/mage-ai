import { useMemo } from 'react';

import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunType from '@interfaces/PipelineRunType';
import SyncRow from '@components/PipelineDetail/Syncs/SyncRow';
import api from '@api';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';

type PipelineSchedulesProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineSchedules({
  pipeline,
}: PipelineSchedulesProp) {
  const pipelineUUID = pipeline.uuid;
  const {
    data: dataPipelineRuns,
    mutate: fetchPipelineRuns,
  } = api.pipeline_runs.list({
    _limit: 40,
    _offset: 0,
    pipeline_uuid: pipelineUUID,
  }, {
    refreshInterval: 5000,
  });
  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);

  return (
    <PipelineDetailPage
      breadcrumbs={[
        {
          label: () => 'Syncs',
        },
      ]}
      // buildSidekick={buildSidekick}
      pageName={PageNameEnum.SYNCS}
      pipeline={pipeline}
      title={({ name }) => `${name} syncs`}
      uuid={`${PageNameEnum.TRIGGERS}_${pipelineUUID}`}
    >
      {pipelineRuns.map((pipelineRun: PipelineRunType) => (
        <SyncRow
          key={pipelineRun.id}
          pipelineRun={pipelineRun}
        />
      ))}
    </PipelineDetailPage>
  );
}

PipelineSchedules.getInitialProps = async (ctx: any) => {
  const { pipeline: pipelineUUID }: { pipeline: string } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PipelineSchedules;
