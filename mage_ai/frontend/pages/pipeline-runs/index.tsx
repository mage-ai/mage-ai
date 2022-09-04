import NextLink from 'next/link';
import Router from 'next/router';
import { useMemo } from 'react';

import Button from '@oracle/elements/Button';
import Dashboard from '@components/Dashboard';
import Link from '@oracle/elements/Link';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { TodoList } from '@oracle/icons';
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
      uuid="pipeline_runs/index"
    >
      <Table
        columnFlex={[null, null, 1, 1, null, null]}
        columns={[
          {
            uuid: 'Date',
          },
          {
            uuid: 'Status',
          },
          {
            uuid: 'Pipeline',
          },
          {
            uuid: 'Trigger',
          },
          {
            uuid: 'Block runs',
          },
          {
            uuid: 'Logs',
          }
        ]}
        rows={pipelineRuns.map(({
          block_runs_count: blockRunsCount,
          created_at: createdAt,
          id,
          pipeline_schedule_id: pipelineScheduleId,
          pipeline_schedule_name: pipelineScheduleName,
          pipeline_uuid: pipelineUUID,
          status,
        }: PipelineRunType) => [
          <Text default monospace>
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
          <Text default monospace>
            {blockRunsCount}
          </Text>,
          <Button
            default
            iconOnly
            noBackground
            onClick={() => Router.push(
              `/pipelines/${pipelineUUID}/logs?pipeline_run_id[]=${id}`,
            )}
          >
            <TodoList default size={2 * UNIT} />
          </Button>,
        ])}
      />
    </Dashboard>
  );
}

export default RunListPage;
