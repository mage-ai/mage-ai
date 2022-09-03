import Router from 'next/router';
import NextLink from 'next/link';
import { useMemo, useState } from 'react';

import Button from '@oracle/elements/Button';
import DependencyGraph from '@components/DependencyGraph';
import Divider from '@oracle/elements/Divider';
import Flex from '@oracle/components/Flex';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { ChevronRight, TodoList } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';

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
      <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
        <Headline level={5}>
          Pipeline runs
        </Headline>
        <Divider light mt={PADDING_UNITS} short />
      </Spacing>

      <Table
        columnFlex={[null, 1, 2, 1, 2, null, null]}
        columns={[
          {
            uuid: 'Date',
          },
          {
            uuid: 'Status',
          },
          {
            uuid: 'Schedule',
          },
          {
            uuid: 'Block runs',
          },
          {
            uuid: 'Completed',
          },
          {
            uuid: 'Logs',
          },
          {
            label: () => '',
            uuid: 'action',
          },
        ]}
        onClickRow={(rowIndex) => setSelectedRun(pipelineRuns[rowIndex])}
        rows={pipelineRuns.map(({
          block_runs_count: blockRunsCount,
          completed_at: completedAt,
          created_at: createdAt,
          id,
          pipeline_schedule_id: pipelineScheduleId,
          pipeline_schedule_name: pipelineScheduleName,
          pipeline_uuid: pipelineUUID,
          status,
        }: PipelineRunType) => [
          <Text monospace default>
            {createdAt}
          </Text>,
          <Text
            danger={RunStatus.FAILED === status}
            info={RunStatus.INITIAL === status}
            default={RunStatus.CANCELLED === status}
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
          <Text default>
            {blockRunsCount}
          </Text>,
          <Text monospace default={!completedAt}>
            {completedAt || '-'}
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
          <Flex flex={1} justifyContent="flex-end">
            <ChevronRight default size={2 * UNIT} />
          </Flex>,
        ])}
        uuid="pipeline-runs"
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
