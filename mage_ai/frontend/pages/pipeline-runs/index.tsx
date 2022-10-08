import NextLink from 'next/link';
import Router, { useRouter } from 'next/router';
import { useMemo } from 'react';

import Button from '@oracle/elements/Button';
import Dashboard from '@components/Dashboard';
import Link from '@oracle/elements/Link';
import Paginate from '@components/shared/Paginate';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { TodoList } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { indexBy } from '@utils/array';
import { queryFromUrl, queryString } from '@utils/url';

const LIMIT = 30;

function RunListPage() {
  const router = useRouter();
  const q = queryFromUrl();
  const page = q?.page ? q.page : 0;

  const { data } = api.pipelines.list();
  const { data: dataPipelineRuns } = api.pipeline_runs.list({
    _limit: LIMIT,
    _offset: page * LIMIT,
  });

  const pipelines = useMemo(() => data?.pipelines || [], [data]);
  const pipelinesByUUID = useMemo(() => indexBy(pipelines, ({ uuid }) => uuid), [pipelines]);
  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);
  const totalRuns = useMemo(() => dataPipelineRuns?.total_count || [], [dataPipelineRuns]);

  return (
    <Dashboard
      title="Pipeline runs"
      uuid="pipeline_runs/index"
    >
      <Table
        columnFlex={[null, 1, 1, 1, null, null]}
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
            monospace
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
      <Spacing p={2}>
        <Paginate
          page={Number(page)}
          maxPages={9}
          onUpdate={(p) => {
            const newPage = Number(p);
            const updatedQuery = {
              ...q,
              page: newPage >= 0 ? newPage : 0,
            }
            router.push(
              '/pipeline-runs',
              `/pipeline-runs?${queryString(updatedQuery)}`,
            );
          }}
          totalPages={Math.ceil(totalRuns / LIMIT)}
        />
      </Spacing>
    </Dashboard>
  );
}

export default RunListPage;
