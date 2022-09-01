import NextLink from 'next/link';
import { useMemo } from 'react';
import { useMutation } from 'react-query';

import DependencyGraph from '@components/DependencyGraph';
import FlexContainer from '@oracle/components/FlexContainer';
import FlexTable from '@oracle/components/FlexTable';
import Link from '@oracle/elements/Link';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import Text from '@oracle/elements/Text';
import api from '@api';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { UNIT } from '@oracle/styles/units/spacing';

type PipelineRunsProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineRuns({
  pipeline,
}: PipelineRunsProp) {
  const pipelineUUID = pipeline.uuid;

  const { data: dataPipelineRuns } = api.pipeline_runs.list({
    pipeline_uuid: pipelineUUID,
  });
  const pipelineRuns = useMemo(() => dataPipelineRuns?.pipeline_runs || [], [dataPipelineRuns]);

  return (
    <PipelineDetailPage
      buildSidekick={props => <DependencyGraph {...props} />}
      breadcrumbs={[
        {
          label: () => 'Pipeline runs',
        },
      ]}
      pageName={PageNameEnum.PIPELINE_RUNS}
      pipeline={pipeline}
      title={({ name }) => `${name} pipeline runs`}
      uuid={`${PageNameEnum.PIPELINE_RUNS}_${pipelineUUID}`}
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
            Schedule
          </Text>,
          <Text bold monospace muted>
            Block runs
          </Text>,
          <Text bold monospace muted>
            Completed at
          </Text>,
        ]}
        columnFlex={[3, 2, 2, 3, 3]}
        rows={pipelineRuns.map(({
          block_runs_count: blockRunsCount,
          completed_at: completedAt,
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
            as={`/pipelines/${pipelineUUID}/schedules/${pipelineScheduleId}`}
            href={'/pipelines/[pipeline]/schedules/[...slug]'}
            passHref
          >
            <Link bold sameColorAsText>
              {pipelineScheduleName}
            </Link>
          </NextLink>,
          <Text>
            {blockRunsCount}
          </Text>,
          <Text monospace muted={!completedAt}>
            {completedAt || '-'}
          </Text>,
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
