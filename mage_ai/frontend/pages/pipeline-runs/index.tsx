import { useMemo } from 'react';
import { useRouter } from 'next/router';

import Dashboard from '@components/Dashboard';
import FlexContainer from '@oracle/components/FlexContainer';
import Paginate from '@components/shared/Paginate';
import PipelineRunsTable from '@components/PipelineDetail/Runs/Table';
import PrivateRoute from '@components/shared/PrivateRoute';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  PipelineRunReqQueryParamsType,
  RUN_STATUS_TO_LABEL,
} from '@interfaces/PipelineRunType';
import { RunStatus as RunStatusEnum } from '@interfaces/BlockRunType';
import { UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';
import { indexBy } from '@utils/array';
import { queryFromUrl, queryString } from '@utils/url';

const LIMIT = 25;

function RunListPage() {
  const router = useRouter();
  const q = queryFromUrl();
  const page = q?.page ? q.page : 0;

  const { data } = api.pipelines.list();
  const pipelineRunsRequestQuery: PipelineRunReqQueryParamsType = {
    _limit: LIMIT,
    _offset: page * LIMIT,
  };
  if (q?.status) {
    pipelineRunsRequestQuery.status = q.status;
  }
  const {
    data: dataPipelineRuns,
    mutate: fetchPipelineRuns,
  } = api.pipeline_runs.list(
    pipelineRunsRequestQuery,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    },
  );

  const pipelines = useMemo(() => data?.pipelines || [], [data]);
  const pipelinesByUUID = useMemo(() => indexBy(pipelines, ({ uuid }) => uuid), [pipelines]);
  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);
  const totalRuns = useMemo(() => dataPipelineRuns?.metadata?.count || [], [dataPipelineRuns]);

  return (
    <Dashboard
      title="Pipeline runs"
      uuid="pipeline_runs/index"
    >
      <Spacing mx={2} my={1}>
        <FlexContainer alignItems="center">
          <Text bold default large>Filter runs by status:</Text>
          <Spacing mr={1} />
          <Select
            compact
            defaultColor
            fitContent
            onChange={e => {
              e.preventDefault();
              const updatedStatus = e.target.value;
              if (updatedStatus === 'all') {
                router.push('/pipeline-runs');
              } else {
                goToWithQuery(
                  {
                    page: 0,
                    status: e.target.value,
                  },
                );
              }
            }}
            paddingRight={UNIT * 4}
            placeholder="Select run status"
            value={q?.status || 'all'}
          >
            <option key="all_statuses" value="all">
              All statuses
            </option>
            {Object.values(RunStatusEnum).map(status => (
              <option key={status} value={status}>
                {RUN_STATUS_TO_LABEL[status]}
              </option>
            ))}
          </Select>
        </FlexContainer>
      </Spacing>
      <PipelineRunsTable
        fetchPipelineRuns={fetchPipelineRuns}
        pipelineRuns={pipelineRuns}
      />
      <Spacing p={2}>
        <Paginate
          maxPages={9}
          onUpdate={(p) => {
            const newPage = Number(p);
            const updatedQuery = {
              ...q,
              page: newPage >= 0 ? newPage : 0,
            };
            router.push(
              '/pipeline-runs',
              `/pipeline-runs?${queryString(updatedQuery)}`,
            );
          }}
          page={Number(page)}
          totalPages={Math.ceil(totalRuns / LIMIT)}
        />
      </Spacing>
    </Dashboard>
  );
}

RunListPage.getInitialProps = async () => ({});

export default PrivateRoute(RunListPage);
