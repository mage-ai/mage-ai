import NextLink from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import DependencyGraph from '@components/DependencyGraph';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Headline from '@oracle/elements/Headline';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Link from '@oracle/elements/Link';
import PipelineDetailPage from '@components/PipelineDetailPage';
import PipelineScheduleType, {
  SCHEDULE_TYPE_TO_LABEL,
  ScheduleStatusEnum,
} from '@interfaces/PipelineScheduleType';
import PopupMenu from '@oracle/components/PopupMenu';
import RuntimeVariables from '@components/RuntimeVariables';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { Add, Edit, Pause, PlayButtonFilled, TodoList, Trash } from '@oracle/icons';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PageNameEnum } from '@components/PipelineDetailPage/constants';
import { getFormattedVariables } from '@components/Sidekick/utils';
import { isEmptyObject } from '@utils/hash';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { randomNameGenerator } from '@utils/string';
import { useWindowSize } from '@utils/sizes';

type PipelineSchedulesProp = {
  pipeline: {
    uuid: string;
  };
};

function PipelineSchedules({
  pipeline,
}: PipelineSchedulesProp) {
  const router = useRouter();
  const pipelineUUID = pipeline.uuid;
  const [deleteConfirmationOpenIdx, setDeleteConfirmationOpenIdx] = useState<string>(null);
  const { height: windowHeight } = useWindowSize();

  const {
    data: dataGlobalVariables,
  } = api.variables.pipelines.list(pipelineUUID);
  const globalVariables = dataGlobalVariables?.variables;
  const {
    data: dataPipelineSchedules,
    mutate: fetchPipelineSchedules,
  } = api.pipeline_schedules.pipelines.list(pipelineUUID);
  const pipelinesSchedules: PipelineScheduleType[] =
    useMemo(() => dataPipelineSchedules?.pipeline_schedules || [], [dataPipelineSchedules]);

  const [createSchedule, { isLoading: isLoadingCreateSchedule }] = useMutation(
    api.pipeline_schedules.pipelines.useCreate(pipelineUUID),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: ({
            pipeline_schedule: {
              id,
            },
          }) => router.push(
            '/pipelines/[pipeline]/triggers/[...slug]',
            `/pipelines/${pipeline?.uuid}/triggers/${id}/edit`,
          ),
          onErrorCallback: ({
            error: {
              errors,
              message,
            },
          }) => {
            console.log(errors, message);
          },
        }
      )
    }
  );

  const [updatePipelineSchedule] = useMutation(
    (pipelineSchedule: PipelineScheduleType) =>
      api.pipeline_schedules.useUpdate(pipelineSchedule.id)({
        pipeline_schedule: pipelineSchedule,
      }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
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

  const [deletePipelineTrigger] = useMutation(
    (id: string) => api.pipeline_schedules.useDelete(id)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipelineSchedules();
            router.push(
              '/pipelines/[pipeline]/triggers',
              `/pipelines/${pipelineUUID}/triggers`,
            );
          },
        },
      ),
    },
  );

  const [selectedSchedule, setSelectedSchedule] = useState<PipelineScheduleType>();
  const buildSidekick = useMemo(() => {
    const variablesOrig =
      getFormattedVariables(
        globalVariables,
        block => block.uuid === 'global',
      )?.reduce((acc, { uuid, value }) => ({
        ...acc,
        [uuid]: value,
      }), {});
    const variablesOverride = selectedSchedule?.variables;
    const hasOverride = !isEmptyObject(variablesOverride);

    const showVariables = hasOverride
      ? selectedSchedule?.variables
      : !isEmptyObject(variablesOrig) ? variablesOrig : null;

    return props => {
      const dependencyGraphHeight = props.height - (showVariables ? 151 : 0);

      return (
        <>
          {showVariables && (
            <RuntimeVariables
              hasOverride={hasOverride}
              scheduleType={selectedSchedule?.schedule_type}
              variables={showVariables}
            />
          )}
          {!showVariables && (
            <Spacing p={PADDING_UNITS}>
              <Text>
                This pipeline has no runtime variables.
              </Text>

              <Spacing mt={1}>
                <NextLink
                  as={`/pipelines/${pipelineUUID}/edit?sideview=variables`}
                  href={'/pipelines/[pipeline]/edit'}
                  passHref
                >
                  <Link>
                    Click here
                  </Link>
                </NextLink> <Text inline>
                  to add variables to this pipeline.
                </Text>
              </Spacing>
            </Spacing>
          )}
          <DependencyGraph
            {...props}
            height={dependencyGraphHeight}
            noStatus
          />
        </>
      );
    };
  }, [
    globalVariables,
    selectedSchedule,
  ]);

  return (
    <PipelineDetailPage
      breadcrumbs={[
        {
          label: () => 'Triggers',
        },
      ]}
      buildSidekick={buildSidekick}
      pageName={PageNameEnum.TRIGGERS}
      pipeline={pipeline}
      subheaderBackgroundImage="/images/banner-shape-purple-peach.jpg"
      subheaderButton={
        <KeyboardShortcutButton
          beforeElement={<Add size={2.5 * UNIT} />}
          blackBorder
          inline
          loading={isLoadingCreateSchedule}
          noHoverUnderline
          // @ts-ignore
          onClick={() => createSchedule({
            pipeline_schedule: {
              name: randomNameGenerator(),
            },
          })}
          sameColorAsText
          uuid="PipelineDetailPage/add_new_schedule"
        >
          Create
        </KeyboardShortcutButton>
      }
      subheaderText={<Text bold large>Set up a new trigger for this pipeline.</Text>}
      title={({ name }) => `${name} triggers`}
      uuid={`${PageNameEnum.TRIGGERS}_${pipelineUUID}`}
    >
      <Spacing mt={PADDING_UNITS} px={PADDING_UNITS}>
        <Headline level={5}>
          Pipeline triggers
        </Headline>
      </Spacing>

      <Divider light mt={PADDING_UNITS} short />

      <Table
        columnFlex={[null, 1, 1, 3, 1, null, null, null]}
        columns={[
          {
            label: () => '',
            uuid: 'action',
          },
          {
            uuid: 'Status',
          },
          {
            uuid: 'Type',
          },
          {
            uuid: 'Name',
          },
          {
            uuid: 'Frequency',
          },
          {
            uuid: 'Runs',
          },
          {
            uuid: 'Logs',
          },
          {
            label: () => '',
            uuid: 'edit/delete',
          },
        ]}
        isSelectedRow={(rowIndex: number) => pipelinesSchedules[rowIndex].id === selectedSchedule?.id}
        onClickRow={(rowIndex: number) => setSelectedSchedule(pipelinesSchedules[rowIndex])}
        rows={pipelinesSchedules.map((pipelineSchedule: PipelineScheduleType) => {
          const {
            id,
            pipeline_runs_count: pipelineRunsCount,
            name,
            schedule_interval: scheduleInterval,
            status,
          } = pipelineSchedule;

          return [
            <Button
              iconOnly
              key="toggle_trigger"
              noBackground
              noBorder
              noPadding
              onClick={(e) => {
                pauseEvent(e);
                updatePipelineSchedule({
                  id: pipelineSchedule.id,
                  status: ScheduleStatusEnum.ACTIVE === status
                    ? ScheduleStatusEnum.INACTIVE
                    : ScheduleStatusEnum.ACTIVE,
                });
              }}
            >
              {ScheduleStatusEnum.ACTIVE === status
                ? <Pause muted size={2 * UNIT} />
                : <PlayButtonFilled default size={2 * UNIT} />
              }
            </Button>,
            <Text
              default={ScheduleStatusEnum.INACTIVE === status}
              key="trigger_status"
              monospace
              success={ScheduleStatusEnum.ACTIVE === status}
            >
              {status}
            </Text>,
            <Text
              default
              key="trigger_type"
              monospace
            >
              {SCHEDULE_TYPE_TO_LABEL[pipelineSchedule.schedule_type]?.()}
            </Text>,
            <NextLink
              as={`/pipelines/${pipelineUUID}/triggers/${id}`}
              href={'/pipelines/[pipeline]/triggers/[...slug]'}
              key="trigger_name"
              passHref
            >
              <Link
                bold
                onClick={(e) => {
                  pauseEvent(e);
                  router.push(
                    '/pipelines/[pipeline]/triggers/[...slug]',
                    `/pipelines/${pipelineUUID}/triggers/${id}`,
                  );
                }}
                sameColorAsText
              >
                {name}
              </Link>
            </NextLink>,
            <Text default key="trigger_frequency" monospace>
              {scheduleInterval}
            </Text>,
            <Text default key="trigger_run_count" monospace>
              {pipelineRunsCount}
            </Text>,
            <Button
              default
              iconOnly
              key="logs_button"
              noBackground
              onClick={() => router.push(
                `/pipelines/${pipelineUUID}/logs?pipeline_schedule_id[]=${id}`,
              )}
            >
              <TodoList default size={2 * UNIT} />
            </Button>,
            <FlexContainer key="edit_delete_buttons">
              <Button
                default
                iconOnly
                noBackground
                onClick={() => router.push(`/pipelines/${pipelineUUID}/triggers/${id}/edit`)}
                title="Edit"
              >
                <Edit default size={2 * UNIT} />
              </Button>
              <Spacing mr={1} />
              <Button
                default
                iconOnly
                noBackground
                onClick={() => setDeleteConfirmationOpenIdx(id)}
                title="Delete"
              >
                <Trash default size={2 * UNIT} />
              </Button>
              <ClickOutside
                onClickOutside={() => setDeleteConfirmationOpenIdx(null)}
                open={deleteConfirmationOpenIdx === id}
              >
                <PopupMenu
                  danger
                  onCancel={() => setDeleteConfirmationOpenIdx(null)}
                  onClick={() => deletePipelineTrigger(id)}
                  right={UNIT * 2}
                  title={`Are you sure you want to delete the trigger ${name}?`}
                  top={(windowHeight / 2) - (UNIT * 16)}
                  width={UNIT * 40}
                />
              </ClickOutside>
            </FlexContainer>,
          ];
        })}
        uuid="pipeline-triggers"
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
