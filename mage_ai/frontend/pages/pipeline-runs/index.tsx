import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Dashboard from '@components/Dashboard';
import ErrorsType from '@interfaces/ErrorsType';
import FlexContainer from '@oracle/components/FlexContainer';
import Paginate, { MAX_PAGES, ROW_LIMIT } from '@components/shared/Paginate';
import PipelineRunsTable from '@components/PipelineDetail/Runs/Table';
import PrivateRoute from '@components/shared/PrivateRoute';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import {
  PIPELINE_RUN_STATUSES,
  PipelineRunReqQueryParamsType,
  RUN_STATUS_TO_LABEL,
} from '@interfaces/PipelineRunType';
import { UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl, queryString } from '@utils/url';
import { storeLocalTimezoneSetting } from '@components/settings/workspace/utils';

function RunListPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<ErrorsType>(null);
  const q = queryFromUrl();
  const page = q?.page ? q.page : 0;

  const { data: dataProjects } = api.projects.list();
  const project: ProjectType = useMemo(() => dataProjects?.projects?.[0], [dataProjects]);
  const _ = useMemo(
    () => storeLocalTimezoneSetting(project?.features?.[FeatureUUIDEnum.LOCAL_TIMEZONE]),
    [project?.features],
  );

  const pipelineRunsRequestQuery: PipelineRunReqQueryParamsType = {
    _limit: ROW_LIMIT,
    _offset: page * ROW_LIMIT,
    disable_retries_grouping: true,
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

  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);
  const totalRuns = useMemo(() => dataPipelineRuns?.metadata?.count || [], [dataPipelineRuns]);

  return (
    <Dashboard
      errors={errors}
      setErrors={setErrors}
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
            {PIPELINE_RUN_STATUSES.map(status => (
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
        setErrors={setErrors}
      />
      <Spacing p={2}>
        <Paginate
          maxPages={MAX_PAGES}
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
          totalPages={Math.ceil(totalRuns / ROW_LIMIT)}
        />
      </Spacing>
    </Dashboard>
  );
}

RunListPage.getInitialProps = async () => ({});

export default PrivateRoute(RunListPage);
