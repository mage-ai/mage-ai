import { useMemo } from 'react';
import { useRouter } from 'next/router';

import Dashboard from '@components/Dashboard';
import Paginate, { ROW_LIMIT } from '@components/shared/Paginate';
import PrivateRoute from '@components/shared/PrivateRoute';
import Spacing from '@oracle/elements/Spacing';
import TriggersTable from '@components/Triggers/Table';
import api from '@api';
import {
  PipelineScheduleReqQueryParamsType,
} from '@interfaces/PipelineScheduleType';
import { queryFromUrl, queryString } from '@utils/url';

function TriggerListPage() {
  const router = useRouter();
  const q = queryFromUrl();
  const page = q?.page ? q.page : 0;

  const pipelineSchedulesRequestQuery: PipelineScheduleReqQueryParamsType = {
    _limit: ROW_LIMIT,
    _offset: page * ROW_LIMIT,
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
    () => dataPipelineSchedules?.total_count || [],
    [dataPipelineSchedules],
  );

  return (
    <Dashboard
      title="Triggers"
      uuid="triggers/index"
    >
      <TriggersTable
        confirmDialogueTopOffset={50}
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
