import { useMemo } from 'react';
import { useMutation } from 'react-query';

import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlexTable from '@oracle/components/FlexTable';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRun from '@interfaces/PipelineRun';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ChevronRight } from '@oracle/icons';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { UNIT } from '@oracle/styles/units/spacing';

function PipelineRuns({
  pipeline,
}) {
  const pipelineUUID = pipeline.uuid;
  const { data: dataPipelineRuns } = api.pipeline_runs.list({
    pipeline_uuid: pipelineUUID,
  });
  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);

  return (
    <PipelineDetailPage
      breadcrumbs={[
        {
          label: () => 'Runs',
        },
      ]}
      pageName={PageNameEnum.RUNS}
      pipeline={pipeline}
      title={({ name }) => `${name} schedules`}
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
            Schedule
          </Text>,
          <Text bold monospace muted>
            Block runs
          </Text>,
          null,
        ]}
        columnFlex={[4, 2, 1, 1]}
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
    </PipelineDetailPage>
  );
}

PipelineRuns.getInitialProps = async (ctx: any) => {
  const { pipeline: pipelineUUID }: { pipeline: string } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PipelineRuns;
