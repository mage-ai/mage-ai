import { useEffect, useMemo, useState } from 'react';
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
import Toolbar, { DateRangePickerProps } from '@components/shared/Table/Toolbar';
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

  const urlStartTimestamp = Number.isFinite(Number(q?.start_timestamp))
    ? Number(q.start_timestamp)
    : undefined;
  const urlEndTimestamp = Number.isFinite(Number(q?.end_timestamp))
    ? Number(q.end_timestamp)
    : undefined;

  const [startTimestamp, setStartTimestamp] = useState<number | undefined>(urlStartTimestamp);
  const [endTimestamp, setEndTimestamp] = useState<number | undefined>(urlEndTimestamp);
  const [datePickerOpen, setDatePickerOpen] = useState<boolean>(false);

  useEffect(() => {
    setStartTimestamp(urlStartTimestamp);
    setEndTimestamp(urlEndTimestamp);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlStartTimestamp, urlEndTimestamp]);

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
  if (startTimestamp !== undefined) {
    pipelineRunsRequestQuery.start_timestamp = startTimestamp;
  }
  if (endTimestamp !== undefined) {
    pipelineRunsRequestQuery.end_timestamp = endTimestamp;
  }
  const {
    data: dataPipelineRuns,
    mutate: fetchPipelineRuns,
  } = api.pipeline_runs.list(
    pipelineRunsRequestQuery,
    {
      refreshInterval: datePickerOpen ? 0 : 3000,
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

  const dateRangePickerProps: DateRangePickerProps = useMemo(() => ({
    endTimestamp,
    onApply: (start, end) => {
      const newStart = start ?? undefined;
      const newEnd = end ?? undefined;

      setStartTimestamp(newStart);
      setEndTimestamp(newEnd);

      const updatedQuery = { ...queryFromUrl() };
      if (newStart !== undefined) {
        updatedQuery.start_timestamp = newStart;
      } else {
        delete updatedQuery.start_timestamp;
      }
      if (newEnd !== undefined) {
        updatedQuery.end_timestamp = newEnd;
      } else {
        delete updatedQuery.end_timestamp;
      }
      delete updatedQuery.page;
      router.push(
        '/pipeline-runs',
        `/pipeline-runs?${queryString(updatedQuery)}`,
        { shallow: true },
      );
    },
    onOpenChange: setDatePickerOpen,
    startTimestamp,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [endTimestamp, startTimestamp]);

  const toolbarEl = useMemo(() => (
    <Toolbar
      dateRangePickerProps={dateRangePickerProps}
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
        const updatedQuery: Record<string, unknown> = {};
        if (startTimestamp !== null && startTimestamp !== undefined) {
          updatedQuery.start_timestamp = startTimestamp;
        }
        if (endTimestamp !== null && endTimestamp !== undefined) {
          updatedQuery.end_timestamp = endTimestamp;
        }
        const qs = queryString(updatedQuery);
        router.push(
          '/pipeline-runs',
          qs ? `/pipeline-runs?${qs}` : '/pipeline-runs',
          { shallow: true },
        );
      }}
      query={query}
      resetPageOnFilterApply
    />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [
    // The "query" dependency is intentionally excluded to avoid the filters
    // being reset every time pipeline runs are fetched.
    dateRangePickerProps,
    endTimestamp,
    pipelineUUIDs,
    router,
    startTimestamp,
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
                    { shallow: true },
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
