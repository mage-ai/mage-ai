import { useMemo } from 'react';

import Dashboard from '@components/Dashboard';
import Flex from '@oracle/components/Flex';
import FlexTable from '@oracle/components/FlexTable';
import PipelineRunType from '@interfaces/PipelineRunType';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ChevronRight } from '@oracle/icons';
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
        buildLinkProps={(rowIndex: number) => {
          const pipelineRun: PipelineRunType = pipelineRuns[rowIndex];

          return {
            as: `/pipelines/${pipelineRun.pipeline_uuid}/schedules/${pipelineRun.pipeline_schedule_id}`,
            href: '/pipelines/[pipeline]/schedules/[...slug]',
          };
        }}
        columnHeaders={[
          <Text bold monospace muted>
            Run date
          </Text>,
          <Text bold monospace muted>
            Pipeline
          </Text>,
          <Text bold monospace muted>
            Schedule
          </Text>,
          <Text bold monospace muted>
            Block runs
          </Text>,
          null,
        ]}
        columnFlex={[4, 2, 2, 1, 1]}
        rows={pipelineRuns.map(({
          block_runs_count: blockRunsCount,
          created_at: createdAt,
          pipeline_schedule_name: pipelineScheduleName,
          pipeline_uuid: pipelineUUID,
        }: PipelineRunType) => [
          <Text monospace>
            {createdAt}
          </Text>,
          <Text>
            {pipelinesByUUID[pipelineUUID]?.name}
          </Text>,
          <Text>
            {pipelineScheduleName}
          </Text>,
          <Text>
            {blockRunsCount}
          </Text>,
          <Flex flex={1} justifyContent="flex-end">
            <ChevronRight muted size={2 * UNIT} />
          </Flex>
        ])}
      />
    </Dashboard>
  );
}

export default RunListPage;
