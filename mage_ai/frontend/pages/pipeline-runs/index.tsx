import { useMemo } from 'react';
import { useRouter } from 'next/router';

import Dashboard from '@components/Dashboard';
import Paginate from '@components/shared/Paginate';
import PipelineRunsTable from '@components/PipelineDetail/Runs/Table';
import Spacing from '@oracle/elements/Spacing';
import api from '@api';
import { indexBy } from '@utils/array';
import { queryFromUrl, queryString } from '@utils/url';

const LIMIT = 30;

function RunListPage() {
  const router = useRouter();
  const q = queryFromUrl();
  const page = q?.page ? q.page : 0;

  const { data } = api.pipelines.list();
  const {
    data: dataPipelineRuns,
    mutate: fetchPipelineRuns,
  } = api.pipeline_runs.list({
    _limit: LIMIT,
    _offset: page * LIMIT,
  }, {
    refreshInterval: 3000,
    revalidateOnFocus: true,
  });

  const pipelines = useMemo(() => data?.pipelines || [], [data]);
  const pipelinesByUUID = useMemo(() => indexBy(pipelines, ({ uuid }) => uuid), [pipelines]);
  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);
  const totalRuns = useMemo(() => dataPipelineRuns?.total_count || [], [dataPipelineRuns]);

  return (
    <Dashboard
      title="Pipeline runs"
      uuid="pipeline_runs/index"
    >
      <PipelineRunsTable
        fetchPipelineRuns={fetchPipelineRuns}
        pipelineRuns={pipelineRuns}
      />
      <Spacing p={2}>
        <Paginate
          page={Number(page)}
          maxPages={9}
          onUpdate={(p) => {
            const newPage = Number(p);
            const updatedQuery = {
              ...q,
              page: newPage >= 0 ? newPage : 0,
            }
            router.push(
              '/pipeline-runs',
              `/pipeline-runs?${queryString(updatedQuery)}`,
            );
          }}
          totalPages={Math.ceil(totalRuns / LIMIT)}
        />
      </Spacing>
    </Dashboard>
  );
}

export default RunListPage;
