import { useMemo } from 'react';
import { useRouter } from 'next/router';

import Dashboard from '@components/Dashboard';
import FlexContainer from '@oracle/components/FlexContainer';
import Paginate, { ROW_LIMIT } from '@components/shared/Paginate';
import PrivateRoute from '@components/shared/PrivateRoute';
import Select from '@oracle/elements/Inputs/Select';
import Spacing from '@oracle/elements/Spacing';
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

function TriggerListPage() {
  const router = useRouter();
  const q = queryFromUrl();
  const page = q?.page ? q.page : 0;
  const orderByQuery = q?.order_by || SortQueryParamEnum.CREATED_AT;

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
      title="Triggers"
      uuid="triggers/index"
    >
      <Spacing mx={2} my={1}>
        <FlexContainer alignItems="center">
          <Text bold default large>Sort runs by:</Text>
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

      <TriggersTable
        fetchPipelineSchedules={fetchPipelineSchedules}
        highlightRowOnHover
        includeCreatedAtColumn
        includePipelineColumn
        pipelineSchedules={pipelineSchedules}
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
    </Dashboard>
  );
}

TriggerListPage.getInitialProps = async () => ({});

export default PrivateRoute(TriggerListPage);
