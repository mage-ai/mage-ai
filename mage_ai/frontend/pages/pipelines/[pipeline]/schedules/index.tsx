import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import Router from 'next/router';

import Button from '@oracle/elements/Button';
import DependencyGraph from '@components/DependencyGraph';
import FlexTable from '@oracle/components/FlexTable';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineScheduleType, { ScheduleStatusEnum } from '@interfaces/PipelineScheduleType';
import Text from '@oracle/elements/Text';
import VariableOverwrites from '@components/VariableOverwrites';
import api from '@api';
import { Add, Edit, Pause, PlayButtonFilled } from '@oracle/icons';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';

type PipelineSchedulesProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineSchedules({
  pipeline,
}: PipelineSchedulesProp) {
  const pipelineUUID = pipeline.uuid;

  const {
    data: dataPipelineSchedules,
    mutate: fetchPipelineSchedules,
  } = api.pipeline_schedules.pipelines.list(pipelineUUID);
  const pipelinesSchedules: PipelineScheduleType[] =
    useMemo(() => dataPipelineSchedules?.pipeline_schedules || [], [dataPipelineSchedules]);

  const [updatePipelineSchedule, { isLoading: isLoadingUpdatePipelineSchedule }] = useMutation(
    (pipelineSchedule: PipelineScheduleType) =>
      api.pipeline_schedules.useUpdate(pipelineSchedule.id)({
        pipeline_schedule: pipelineSchedule,
      }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            pipeline_schedule,
          }) => {
            fetchPipelineSchedules();
          },
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
        },
      ),
    },
  );

  const [selectedSchedule, setSelectedSchedule] = useState<PipelineScheduleType>();
  const buildSidekick = useMemo(() => {
    const showVariables = selectedSchedule;

    return props => {
      const dependencyGraphHeight = props.height - (showVariables ? 150 : 0);
      return (
        <>
          {showVariables && (
            <VariableOverwrites
              pipelineSchedule={selectedSchedule}
            />
          )}
          <DependencyGraph
            {...props}
            height={dependencyGraphHeight}
            noStatus
          />
        </>
      )
    };
  }, [selectedSchedule]);

  return (
    <PipelineDetailPage
      breadcrumbs={[
        {
          label: () => 'Schedules',
        },
      ]}
      buildSidekick={buildSidekick}
      pageName={PageNameEnum.SCHEDULES}
      pipeline={pipeline}
      subheaderBackgroundImage='/images/banner-shape-purple-peach.jpg'
      subheaderButton={
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
          Create
        </KeyboardShortcutButton>
      }
      subheaderText={<Text bold large>Set up a new schedule for this pipeline.</Text>}
      title={({ name }) => `${name} schedules`}
      uuid={`${PageNameEnum.SCHEDULES}_${pipelineUUID}`}
    >
      <FlexTable
        columnHeaders={[
          null,
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
          <Text bold monospace muted>
            Edit
          </Text>,,
        ]}
        columnFlex={[1, 3, 10, 10, 4, 2, 1]}
        onClickRow={(rowIndex: number) => setSelectedSchedule(pipelinesSchedules[rowIndex])}
        rows={pipelinesSchedules.map((pipelineSchedule: PipelineScheduleType) => {
          const {
            id,
            pipeline_runs_count: pipelineRunsCount,
            name,
            schedule_interval: scheduleInterval,
            start_time: startTime,
            status,
          } = pipelineSchedule;

          return [
            <Button
              iconOnly
              noBackground
              noBorder
              noPadding
              onClick={(e) => {
                pauseEvent(e);
                updatePipelineSchedule({
                  id: pipelineSchedule.id,
                  status: ScheduleStatusEnum.ACTIVE === status
                    ? ScheduleStatusEnum.INACTIVE
                    : ScheduleStatusEnum.ACTIVE
                });
              }}
            >
              {ScheduleStatusEnum.ACTIVE === status
                ? <Pause muted size={2 * UNIT} />
                : <PlayButtonFilled size={2 * UNIT} success />
              }
            </Button>,
            <Text
              muted={ScheduleStatusEnum.INACTIVE === status}
              success={ScheduleStatusEnum.ACTIVE === status}
            >
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
            <Button
              iconOnly
              noBackground
              onClick={(e) => Router.push(`/pipelines/${pipelineUUID}/schedules/${id}/edit`)}
            >
              <Edit muted size={2 * UNIT} />
            </Button>
          ];
        })}
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
