import { useMemo, useEffect, useState } from 'react';

import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunType from '@interfaces/PipelineRunType';
import SyncRow from '@components/PipelineDetail/Syncs/SyncRow';
import api from '@api';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl } from '@utils/url';

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

  const q = queryFromUrl();

  const [selectedPipelineRun, setSelectedPipelineRun] = useState<PipelineRunType>(null);

  useEffect(() => {
    if (q?.pipeline_run_id) {
      setSelectedPipelineRun(pipelineRuns?.find(({ id }) => id === Number(q.pipeline_run_id)));
    }
  }, [
    pipelineRuns,
    q,
  ]);

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
          onSelect={() => goToWithQuery({
            pipeline_run_id: pipelineRun.id,
          })}
          pipelineRun={pipelineRun}
          selected={selectedPipelineRun?.id === pipelineRun.id}
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
