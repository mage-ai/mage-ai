import { useMemo } from 'react';

import Flex from '@oracle/components/Flex';
import FlexTable from '@oracle/components/FlexTable';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineScheduleType from '@interfaces/PipelineScheduleType';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import api from '@api';
import { Add, ChevronRight } from '@oracle/icons';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { UNIT } from '@oracle/styles/units/spacing';

function PipelineSchedules({
  pipeline,
}) {
  const pipelineUUID = pipeline.uuid;
  const { data } = api.pipeline_schedules.pipelines.list(pipelineUUID);
  const pipelinesSchedules: PipelineScheduleType[] = useMemo(() => data?.pipeline_schedules || [], [data]);

  return (
    <PipelineDetailPage
      breadcrumbs={[
        {
          label: () => 'Schedules',
        },
      ]}
      pageName={PageNameEnum.SCHEDULES}
      pipeline={pipeline}
      subheaderChildren={
        <>
          <Spacing ml={2} />
          <KeyboardShortcutButton
            blackBorder
            beforeElement={<Add size={2.5 * UNIT} />}
            inline
            linkProps={{
              as: `/pipelines/${pipelineUUID}/schedules/new`,
              href: '/pipelines/[pipeline]/schedules/[...slug]',
            }}
            noHoverUnderline
            sameColorAsText
            uuid="PipelineDetailPage/add_new_schedule"
          >
            Add new schedule
          </KeyboardShortcutButton>
        </>
      }
      title={({ name }) => `${name} schedules`}
    >
      <FlexTable
        buildLinkProps={(rowIndex: number) => ({
          as: `/pipelines/${pipelineUUID}/schedules/${pipelinesSchedules[rowIndex].id}`,
          href: '/pipelines/[pipeline]/schedules/[...slug]',
        })}
        columnHeaders={[
          <Text bold monospace muted>
            Status
          </Text>,
          <Text bold monospace muted>
            Start time
          </Text>,
          <Text bold monospace muted>
            Name
          </Text>,
          <Text bold monospace muted>
            Frequency
          </Text>,
          <Text bold monospace muted>
            Runs
          </Text>,
          null,
        ]}
        columnFlex={[1, 3, 3, 1, 1, 1]}
        rows={pipelinesSchedules.map(({
          pipeline_runs_count: pipelineRunsCount,
          name,
          schedule_interval: scheduleInterval,
          start_time: startTime,
          status,
        }) => [
          <Text>
            {status}
          </Text>,
          <Text monospace>
            {startTime}
          </Text>,
          <Text>
            {name}
          </Text>,
          <Text>
            {scheduleInterval}
          </Text>,
          <Text>
            {pipelineRunsCount}
          </Text>,
          <Flex flex={1} justifyContent="flex-end">
            <ChevronRight muted size={2 * UNIT} />
          </Flex>
        ])}
      />
    </PipelineDetailPage>
  );
}

PipelineSchedules.getInitialProps = async (ctx: any) => {
  const { pipeline: pipelineUUID }: { pipeline: string } = ctx.query;

  return {
    pipeline: {
      uuid: pipelineUUID,
    },
  };
};

export default PipelineSchedules;
