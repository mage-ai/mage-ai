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
import api from '@api';
import {
  PIPELINE_RUN_STATUSES_NO_LAST_RUN_FAILED,
  PipelineRunFilterQueryEnum,
  PipelineRunReqQueryParamsType,
  RUN_STATUS_TO_LABEL,
} from '@interfaces/PipelineRunType';
import { UNITS_BETWEEN_ITEMS_IN_SECTIONS } from '@oracle/styles/units/spacing';
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
    include_pipeline_tags: true,
    include_pipeline_uuids: true,
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

  const { data: dataTags } = api.tags.list();
  const tags: TagType[] = useMemo(() => sortByKey(dataTags?.tags || [], ({ uuid }) => uuid), [
    dataTags,
  ]);

  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);
  const totalRuns = useMemo(() => dataPipelineRuns?.metadata?.count || [], [dataPipelineRuns]);
  const pipelineUUIDs = useMemo(() => dataPipelineRuns?.metadata?.pipeline_uuids || [], [dataPipelineRuns]);

  const toolbarEl = useMemo(() => (
    <Toolbar
      filterOptions={{
        pipeline_tag: tags.map(({ uuid }) => uuid),
        pipeline_uuid: pipelineUUIDs,
        status: PIPELINE_RUN_STATUSES_NO_LAST_RUN_FAILED,
      }}
      filterValueLabelMapping={{
        pipeline_tag: tags.reduce((acc, { uuid }) => ({
          ...acc,
          [uuid]: uuid,
        }), {}),
        status: RUN_STATUS_TO_LABEL,
      }}
      onClickFilterDefaults={() => {
        router.push('/pipeline-runs');
      }}
      query={query}
      resetPageOnFilterApply
    />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [
    // The "query" dependency is intentionally excluded to avoid the filters
    // being reset every time pipeline runs are fetched.
    pipelineUUIDs,
    router,
    tags,
  ]);

  return (
    <Dashboard
      errors={errors}
      setErrors={setErrors}
      subheaderChildren={toolbarEl}
      title="Pipeline runs"
      uuid="pipeline_runs/index"
    >
      {!dataPipelineRuns
        ?
          <Spacing p={UNITS_BETWEEN_ITEMS_IN_SECTIONS}>
            <Spinner inverted large />
          </Spacing>
        :
          <>
            <PipelineRunsTable
              fetchPipelineRuns={fetchPipelineRuns}
              includePipelineTags
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
          </>
      }
    </Dashboard>
  );
}

RunListPage.getInitialProps = async () => ({});

export default PrivateRoute(RunListPage);
