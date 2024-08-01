import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Dashboard from '@components/Dashboard';
import ErrorsType from '@interfaces/ErrorsType';
import Paginate, { MAX_PAGES, ROW_LIMIT } from '@components/shared/Paginate';
import PipelineRunsTable from '@components/PipelineDetail/Runs/Table';
import PrivateRoute from '@components/shared/PrivateRoute';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import TagType from '@interfaces/TagType';
import Toolbar from '@components/shared/Table/Toolbar';
import WorkspacesDashboard from '@components/workspaces/Dashboard';
import api from '@api';
import {
  PIPELINE_RUN_STATUSES_NO_LAST_RUN_FAILED,
  PipelineRunFilterQueryEnum,
  PipelineRunReqQueryParamsType,
  RUN_STATUS_TO_LABEL,
} from '@interfaces/PipelineRunType';
import { UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';
import { WorkspacesPageNameEnum } from '@components/workspaces/Dashboard/constants';
import { filterQuery, queryFromUrl, queryString } from '@utils/url';
import { sortByKey } from '@utils/array';
import { storeLocalTimezoneSetting } from '@components/settings/workspace/utils';

function RunListPage() {
  const router = useRouter();
  const [errors, setErrors] = useState<ErrorsType>(null);
  const q = queryFromUrl();
  const page = q?.page ? q.page : 0;
  const query = useMemo(() => filterQuery(q, [
    PipelineRunFilterQueryEnum.PIPELINE_UUID,
    PipelineRunFilterQueryEnum.STATUS,
    PipelineRunFilterQueryEnum.TAG,
  ]), [q]);

  const { data: dataProjects } = api.projects.list();
  const project: ProjectType = useMemo(() => dataProjects?.projects?.[0], [dataProjects]);
  const _ = useMemo(
    () => storeLocalTimezoneSetting(project?.features?.[FeatureUUIDEnum.LOCAL_TIMEZONE]),
    [project?.features],
  );

  const pipelineRunsRequestQuery: PipelineRunReqQueryParamsType = {
    ...query,
    _limit: ROW_LIMIT,
    _offset: page * ROW_LIMIT,
    disable_retries_grouping: true,
    include_all_pipeline_schedules: true,
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
      refreshInterval: 7000,
      revalidateOnFocus: true,
    },
  );

  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);
  const totalRuns = useMemo(() => dataPipelineRuns?.metadata?.count || [], [dataPipelineRuns]);

  const toolbarEl = useMemo(() => (
    <Toolbar
      filterOptions={{
        status: PIPELINE_RUN_STATUSES_NO_LAST_RUN_FAILED,
      }}
      filterValueLabelMapping={{
        status: RUN_STATUS_TO_LABEL,
      }}
      onClickFilterDefaults={() => {
        router.push('/manage/pipeline-runs');
      }}
      query={query}
      resetPageOnFilterApply
    />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [
    // The "query" dependency is intentionally excluded to avoid the filters
    // being reset every time pipeline runs are fetched.
    router,
  ]);

  return (
    <WorkspacesDashboard
      breadcrumbs={[
        {
          label: () => 'Workspaces',
          linkProps: {
            as: '/manage',
            href: '/manage',
          },
        },
        {
          bold: true,
          label: () => 'Pipeline runs',
        },
      ]}
      errors={errors}
      pageName={WorkspacesPageNameEnum.PIPELINE_RUNS}
      setErrors={setErrors}
      subheaderChildren={toolbarEl}
    >
      {!dataPipelineRuns
        ?
          <Spacing p={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
            <Spinner inverted large />
          </Spacing>
        :
          <>
            <PipelineRunsTable
              disableRowSelect
              fetchPipelineRuns={fetchPipelineRuns}
              pipelineRuns={pipelineRuns}
              setErrors={setErrors}
              workspaceFormatting
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
                    '/manage/pipeline-runs',
                    `/manage/pipeline-runs?${queryString(updatedQuery)}`,
                  );
                }}
                page={Number(page)}
                totalPages={Math.ceil(totalRuns / ROW_LIMIT)}
              />
            </Spacing>
          </>
      }
    </WorkspacesDashboard>
  );
}

RunListPage.getInitialProps = async () => ({});

export default PrivateRoute(RunListPage);
