import NextLink from 'next/link';
import { useMemo } from 'react';

import Dashboard from '@components/Dashboard';
import FlexTable from '@oracle/components/FlexTable';
import Link from '@oracle/elements/Link';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import Text from '@oracle/elements/Text';
import api from '@api';
import { UNIT } from '@oracle/styles/units/spacing';
import { indexBy } from '@utils/array';

function RunListPage() {
  const { data } = api.pipelines.list();
  const { data: dataPipelineRuns } = api.pipeline_runs.list();

  const pipelines = useMemo(() => data?.pipelines || [], [data]);
  const pipelinesByUUID = useMemo(() => indexBy(pipelines, ({ uuid }) => uuid), [pipelines]);
  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);

  return (
    <Dashboard
      title="Pipeline runs"
    >
      <FlexTable
        columnHeaders={[
          <Text bold monospace muted>
            Run date
          </Text>,
          <Text bold monospace muted>
            Status
          </Text>,
          <Text bold monospace muted>
            Pipeline
          </Text>,
          <Text bold monospace muted>
            Trigger
          </Text>,
          <Text bold monospace muted>
            Block runs
          </Text>,
        ]}
        columnFlex={[3, 2, 2, 3, 2]}
        rows={pipelineRuns.map(({
          block_runs_count: blockRunsCount,
          created_at: createdAt,
          pipeline_schedule_id: pipelineScheduleId,
          pipeline_schedule_name: pipelineScheduleName,
          pipeline_uuid: pipelineUUID,
          status,
        }: PipelineRunType) => [
          <Text monospace>
            {createdAt}
          </Text>,
          <Text
            danger={RunStatus.FAILED === status}
            info={RunStatus.INITIAL === status}
            muted={RunStatus.CANCELLED === status}
            success={RunStatus.COMPLETED === status}
            warning={RunStatus.RUNNING === status}
          >
            {status}
          </Text>,
          <NextLink
            as={`/pipelines/${pipelineUUID}`}
            href={'/pipelines/[pipeline]'}
            passHref
          >
            <Link bold sameColorAsText>
              {pipelinesByUUID[pipelineUUID]?.name}
            </Link>
          </NextLink>,
          <NextLink
            as={`/pipelines/${pipelineUUID}/triggers/${pipelineScheduleId}`}
            href={'/pipelines/[pipeline]/triggers/[...slug]'}
            passHref
          >
            <Link bold sameColorAsText>
              {pipelineScheduleName}
            </Link>
          </NextLink>,
          <Text>
            {blockRunsCount}
          </Text>,
        ])}
      />
    </Dashboard>
  );
}

export default RunListPage;
