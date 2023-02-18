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
} from '@interfaces/PipelineScheduleType';
import { UNIT } from '@oracle/styles/units/spacing';
import { goToWithQuery } from '@utils/routing';
import { queryFromUrl, queryString } from '@utils/url';

function TriggerListPage() {
  const router = useRouter();
  const q = queryFromUrl();
  const page = q?.page ? q.page : 0;

  const pipelineSchedulesRequestQuery: PipelineScheduleReqQueryParamsType = {
    _limit: ROW_LIMIT,
    _offset: page * ROW_LIMIT,
  };
  const pipelineUUIDFromQuery = q?.pipeline_uuid;

  const {
    data: dataPipelineSchedules,
    mutate: fetchPipelineSchedules,
  } = api.pipeline_schedules.list(
    pipelineSchedulesRequestQuery,
    {
      refreshInterval: pipelineUUIDFromQuery ? 0 : 7500,
      revalidateOnFocus: true,
    },
  );
  const {
    data: dataPipelineSchedulesByPipeline,
    mutate: fetchPipelineSchedulesByPipeline,
  } = api.pipeline_schedules.pipelines.list(
    pipelineUUIDFromQuery,
    pipelineSchedulesRequestQuery,
    { refreshInterval: pipelineUUIDFromQuery ? 7500 : 0 },
  );
  console.log('dataPipelineSchedulesByPipeline:', dataPipelineSchedulesByPipeline);

  const allPipelineSchedules = useMemo(
    () => dataPipelineSchedules?.pipeline_schedules || [],
    [dataPipelineSchedules],
  );
  const pipelineSchedules = useMemo(
    () => (pipelineUUIDFromQuery
      ? dataPipelineSchedulesByPipeline?.pipeline_schedules || []
      : allPipelineSchedules
    ),
    [allPipelineSchedules, dataPipelineSchedulesByPipeline, pipelineUUIDFromQuery],
  );
  const totalSchedules = useMemo(
    () => (pipelineUUIDFromQuery
      ? dataPipelineSchedulesByPipeline?.total_count || []
      : dataPipelineSchedules?.total_count || []
    ),
    [dataPipelineSchedules, dataPipelineSchedulesByPipeline, pipelineUUIDFromQuery],
  );
  const pipelineUUIDsSet: Set<string> = useMemo(() =>
    new Set(allPipelineSchedules.map(({ pipeline_uuid }) => pipeline_uuid)),
    [allPipelineSchedules],
  );

  return (
    <Dashboard
      title="Triggers"
      uuid="triggers/index"
    >
      <Spacing mx={2} my={1}>
        <FlexContainer alignItems="center">
          <Text bold default large>Filter runs by pipeline:</Text>
          <Spacing mr={1} />
          <Select
            compact
            defaultColor
            fitContent
            onChange={e => {
              e.preventDefault();
              const updatedPipeline = e.target.value;
              if (updatedPipeline === '_all_') {
                router.push('/triggers');
              } else {
                goToWithQuery(
                  {
                    page: 0,
                    pipeline_uuid: e.target.value,
                  },
                );
              }
            }}
            paddingRight={UNIT * 4}
            placeholder="Select pipeline"
            value={pipelineUUIDFromQuery || '_all_'}
          >
            <option key="all_pipelines" value="_all_">
              All pipelines
            </option>
            {Array.from(pipelineUUIDsSet).map(pipelineUUID => (
              <option key={pipelineUUID} value={pipelineUUID}>
                {pipelineUUID}
              </option>
            ))}
          </Select>
        </FlexContainer>
      </Spacing>
      <TriggersTable
        confirmDialogueTopOffset={50}
        fetchPipelineSchedules={pipelineUUIDFromQuery
          ? fetchPipelineSchedulesByPipeline
          : fetchPipelineSchedules
        }
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
