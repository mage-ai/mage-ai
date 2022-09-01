import NextLink from 'next/link';
import { useMemo, useState } from 'react';

import DependencyGraph from '@components/DependencyGraph';
import Flex from '@oracle/components/Flex';
import FlexTable from '@oracle/components/FlexTable';
import Link from '@oracle/elements/Link';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ChevronRight } from '@oracle/icons';
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

  const [selectedRun, setSelectedRun] = useState<PipelineRunType>();
  const buildSidekick = useMemo(() => {
    return props => {
      const updatedProps = { ...props };
      if (selectedRun) {
        updatedProps['blockStatus'] = selectedRun.block_runs?.reduce(
          (prev, { block_uuid, status }) => ({ ...prev, [block_uuid]: status }),
          {},
        );
      } else {
        updatedProps['noStatus'] = true;
      }

      return (
        <DependencyGraph
          {...updatedProps}
        />
      );
    };
  }, [selectedRun])

  return (
    <PipelineDetailPage
      buildSidekick={buildSidekick}
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
          null
        ]}
        columnFlex={[3, 2, 2, 3, 3, 1]}
        onClickRow={(rowIndex) => setSelectedRun(pipelineRuns[rowIndex])}
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
