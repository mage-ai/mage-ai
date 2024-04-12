import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import Dashboard from '@components/Dashboard';
import FlexContainer from '@oracle/components/FlexContainer';
import Paginate, { ROW_LIMIT } from '@components/shared/Paginate';
import PrivateRoute from '@components/shared/PrivateRoute';
import ProjectType, { FeatureUUIDEnum } from '@interfaces/ProjectType';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Text from '@oracle/elements/Text';
import TriggersTable from '@components/Triggers/Table';
import api from '@api';
import {
  PipelineScheduleReqQueryParamsType,
  SORT_QUERY_TO_COLUMN_NAME_MAPPING,
  SortQueryParamEnum,
} from '@interfaces/PipelineScheduleType';
import { UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl, queryString } from '@utils/url';
import { storeLocalTimezoneSetting } from '@components/settings/workspace/utils';

function TriggerListPage() {
  const router = useRouter();
  const [errors, setErrors] = useState(null);

  const q = queryFromUrl();
  const page = q?.page ? q.page : 0;
  const orderByQuery = q?.order_by || SortQueryParamEnum.CREATED_AT;

  const { data: dataProjects } = api.projects.list();
  const project: ProjectType = useMemo(() => dataProjects?.projects?.[0], [dataProjects]);
  const _ = useMemo(
    () => storeLocalTimezoneSetting(project?.features?.[FeatureUUIDEnum.LOCAL_TIMEZONE]),
    [project?.features],
  );

  const pipelineSchedulesRequestQuery: PipelineScheduleReqQueryParamsType = {
    _limit: ROW_LIMIT,
    _offset: page * ROW_LIMIT,
    order_by: orderByQuery,
  };

  const {
    data: dataPipelineSchedules,
    mutate: fetchPipelineSchedules,
  } = api.pipeline_schedules.list(
    pipelineSchedulesRequestQuery,
    {
      refreshInterval: 7500,
      revalidateOnFocus: true,
    },
  );

  const pipelineSchedules = useMemo(
    () => dataPipelineSchedules?.pipeline_schedules || [],
    [dataPipelineSchedules],
  );
  const totalSchedules = useMemo(
    () => dataPipelineSchedules?.metadata?.count || [],
    [dataPipelineSchedules],
  );

  return (
    <Dashboard
      errors={errors}
      setErrors={setErrors}
      title="Triggers"
      uuid="triggers/index"
    >
      <Spacing mx={2} my={1}>
        <FlexContainer alignItems="center">
          <Text bold default large>Sort by:</Text>
          <Spacing mr={1} />
          <Select
            compact
            defaultColor
            fitContent
            onChange={e => {
              e.preventDefault();
              goToWithQuery(
                {
                  order_by: e.target.value,
                  page: 0,
                },
              );
            }}
            paddingRight={UNIT * 4}
            placeholder="Select column"
            value={orderByQuery || SortQueryParamEnum.CREATED_AT}
          >
            {Object.entries(SORT_QUERY_TO_COLUMN_NAME_MAPPING).map(([sortKey, sortDisplayValue]) => (
              <option key={sortKey} value={sortKey}>
                {sortDisplayValue}
              </option>
            ))}
          </Select>
        </FlexContainer>
      </Spacing>

      {!dataPipelineSchedules
        ?
          <Spacing m={2}>
            <Spinner inverted large />
          </Spacing>
        :
          <>
            <TriggersTable
              fetchPipelineSchedules={fetchPipelineSchedules}
              highlightRowOnHover
              includeCreatedAtColumn
              includePipelineColumn
              pipelineSchedules={pipelineSchedules}
              setErrors={setErrors}
              stickyHeader
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
                    '/triggers',
                    `/triggers?${queryString(updatedQuery)}`,
                  );
                }}
                page={Number(page)}
                totalPages={Math.ceil(totalSchedules / ROW_LIMIT)}
              />
            </Spacing>
          </>
      }
    </Dashboard>
  );
}

TriggerListPage.getInitialProps = async () => ({});

export default PrivateRoute(TriggerListPage);
