import NextLink from 'next/link';
import { createRef, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import DisableTriggerModal from './DisableTriggerModal';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineScheduleType, {
  SCHEDULE_TYPE_TO_LABEL,
  ScheduleStatusEnum,
} from '@interfaces/PipelineScheduleType';
import PipelineTriggerType from '@interfaces/PipelineTriggerType';
import PipelineType from '@interfaces/PipelineType';
import PopupMenu from '@oracle/components/PopupMenu';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import TagsContainer from '@components/Tags/TagsContainer';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
import useProject from '@utils/models/project/useProject';
import useStatus from '@utils/models/status/useStatus';
import {
  Code,
  Edit,
  Logs,
  Trash,
} from '@oracle/icons';
import {
  DELETE_CONFIRM_WIDTH,
  DELETE_CONFIRM_LEFT_OFFSET_DIFF,
  DELETE_CONFIRM_TOP_OFFSET_DIFF,
  DELETE_CONFIRM_TOP_OFFSET_DIFF_FIRST,
  TIMEZONE_TOOLTIP_PROPS,
  getRunStatusTextProps,
} from '@components/shared/Table/constants';
import { ICON_SIZE_SMALL } from '@oracle/styles/units/icons';
import { RunStatus } from '@interfaces/BlockRunType';
import { UNIT } from '@oracle/styles/units/spacing';
import { TableContainerStyle } from '@components/shared/Table/index.style';
import {
  checkIfCustomInterval,
  convertUtcCronExpressionToLocalTimezone,
} from './utils';
import { dateFormatLong, datetimeInLocalTimezone, utcStringToElapsedTime } from '@utils/date';
import { isViewer } from '@utils/session';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { useModal } from '@context/Modal';

const ICON_SIZE = UNIT * 1.5;

type TriggersTableProps = {
  disableActions?: boolean;
  fetchPipelineSchedules?: () => void;
  highlightRowOnHover?: boolean;
  includeCreatedAtColumn?: boolean;
  includePipelineColumn?: boolean;
  pipeline?: PipelineType;
  pipelineSchedules: PipelineScheduleType[];
  pipelineTriggersByName?: {
    [name: string]: PipelineTriggerType;
  };
  selectedSchedule?: PipelineScheduleType;
  setErrors?: (errors: any) => void;
  setSelectedSchedule?: (schedule: PipelineScheduleType) => void;
  stickyHeader?: boolean;
};

function TriggersTable({
  disableActions,
  fetchPipelineSchedules,
  highlightRowOnHover,
  includeCreatedAtColumn,
  includePipelineColumn,
  pipeline,
  pipelineSchedules,
  pipelineTriggersByName,
  selectedSchedule,
  setErrors,
  setSelectedSchedule,
  stickyHeader,
}: TriggersTableProps) {
  const pipelineUUID = pipeline?.uuid;
  const router = useRouter();

  const { projectPlatformActivated } = useProject();
  const { status: statusProject } = useStatus();

  const toggleTriggerRefs = useRef({});
  const deleteButtonRefs = useRef({});
  const [deleteConfirmationOpenIdx, setDeleteConfirmationOpenIdx] = useState<number>(null);
  const [confirmDialogueTopOffset, setConfirmDialogueTopOffset] = useState<number>(0);
  const [confirmDialogueLeftOffset, setConfirmDialogueLeftOffset] = useState<number>(0);

  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const timezoneTooltipProps = displayLocalTimezone ? TIMEZONE_TOOLTIP_PROPS : {};

  const [updatePipeline]: any = useMutation(
    (pipeline: PipelineType) =>
      api.pipelines.useUpdate(pipeline.uuid)({ pipeline }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipelineSchedules?.();
          },
          onErrorCallback: (response, errors) => setErrors?.({
            errors,
            response,
          }),
        },
      ),
    },
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
            fetchPipelineSchedules?.();
          },
          onErrorCallback: (response, errors) => setErrors?.({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const [deletePipelineTrigger] = useMutation(
    (id: number) => api.pipeline_schedules.useDelete(id)(),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipelineSchedules?.();
            if (pipelineUUID) {
              router.push(
                '/pipelines/[pipeline]/triggers',
                `/pipelines/${pipelineUUID}/triggers`,
              );
            } else {
              fetchPipelineSchedules?.();
            }
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const columnFlex = [];
  const columns = [];

  if (!disableActions) {
    columnFlex.push(...[null]);
    columns.push(...[
      {
        uuid: 'Active',
      },
    ]);
  }

  columnFlex.push(...[1]);
  columns.push(...[
    {
      uuid: 'Name',
    },
  ]);

  if (!disableActions) {
    columnFlex.push(...[null]);
    columns.push(...[
      {
        center: true,
        uuid: 'Logs',
      },
    ]);

    if (projectPlatformActivated) {
      columnFlex.push(...[null]);
      columns.push(...[
        {
          uuid: 'Project',
        },
      ]);
    }

    if (includePipelineColumn) {
      columnFlex.push(...[1]);
      columns.push(...[
        {
          uuid: 'Pipeline',
        },
      ]);
    }

    columnFlex.push(...[null, null]);
    columns.push(...[
      {
        uuid: 'Type',
      },
      {
        uuid: 'Frequency',
      },
    ]);
  }

  columnFlex.push(...[1, 1,  null, null]);
  columns.push(...[
    {
      uuid: 'Latest status',
    },
    {
      ...timezoneTooltipProps,
      uuid: 'Next run date',
    },
    {
      uuid: 'Runs',
    },
    {
      uuid: 'Description',
    },
  ]);

  if (!disableActions) {
    columnFlex.push(...[1]);
    columns.push(...[
      {
        uuid: 'Tags',
      },
    ]);

    if (includeCreatedAtColumn) {
      columnFlex.push(...[null]);
      columns.push(...[
        {
          ...timezoneTooltipProps,
          uuid: 'Created at',
        },
      ]);
    }

    if (!isViewer(router?.basePath)) {
      columnFlex.push(...[null]);
      columns.push(...[
        {
          label: () => '',
          uuid: 'edit/delete',
        },
      ]);
    }
  }

  const [showDisableTriggerModal, hideDisableTriggerModal] = useModal(({
    inProgressRunsCount,
    left,
    pipelineScheduleId,
    pipelineUuid,
    top,
    topOffset,
  }) => (
    <DisableTriggerModal
      inProgressRunsCount={inProgressRunsCount}
      left={left}
      onAllow={(pipelineScheduleId) => {
        hideDisableTriggerModal();
        updatePipelineSchedule({
          id: pipelineScheduleId,
          status: ScheduleStatusEnum.INACTIVE,
        });
      }}
      onStop={(pipelineScheduleId, pipelineUuid) => {
        hideDisableTriggerModal();
        // Cancel all in progress runs
        updatePipeline({
          pipeline_schedule_id: pipelineScheduleId,
          status: RunStatus.CANCELLED,
          uuid: pipelineUuid,
        });
        updatePipelineSchedule({
          id: pipelineScheduleId,
          status: ScheduleStatusEnum.INACTIVE,
        });
      }}
      pipelineScheduleId={pipelineScheduleId}
      pipelineUuid={pipelineUuid}
      top={top}
      topOffset={topOffset}
    />
  ), {
  }, [], {
    background: true,
    uuid: 'disable_trigger',
  });

  const handleTogglePipeline = ({
    event,
    inProgressRunsCount,
    pipelineIsActive,
    pipelineScheduleId,
    pipelineUuid,
  }) => {
    pauseEvent(event);
    if (pipelineIsActive && inProgressRunsCount > 0) {
      const toggleEl = toggleTriggerRefs.current[pipelineScheduleId]?.current as Element;
      const { height, left, top } = toggleEl?.getBoundingClientRect();
      showDisableTriggerModal({ inProgressRunsCount, left, pipelineScheduleId, pipelineUuid, top, topOffset: height });
    } else {
      updatePipelineSchedule({
        id: pipelineScheduleId,
        status: pipelineIsActive
          ? ScheduleStatusEnum.INACTIVE
          : ScheduleStatusEnum.ACTIVE,
      });
    }
  };

  return (
    <TableContainerStyle overflowVisible>
      {pipelineSchedules.length === 0
        ?
          <Spacing px ={3} py={1}>
            <Text bold default monospace muted>
              No triggers available
            </Text>
          </Spacing>
        :
          <Table
            columnFlex={columnFlex}
            columns={columns}
            highlightRowOnHover={highlightRowOnHover}
            isSelectedRow={(rowIndex: number) => pipelineSchedules[rowIndex].id === selectedSchedule?.id}
            onClickRow={setSelectedSchedule
              ? (rowIndex: number) => setSelectedSchedule?.(pipelineSchedules[rowIndex])
              : null
            }
            rowVerticalPadding={6}
            rows={pipelineSchedules.map((
              pipelineSchedule: PipelineScheduleType,
              idx: number,
            ) => {
              const {
                id,
                created_at: createdAt,
                description,
                next_pipeline_run_date: nextRunDate,
                pipeline_in_progress_runs_count: inProgressRunsCount,
                pipeline_runs_count: pipelineRunsCount,
                pipeline_uuid: triggerPipelineUUID,
                last_pipeline_run_status: lastPipelineRunStatus,
                name,
                repo_path: repoPath,
                schedule_interval: scheduleInterval,
                status,
                tags,
              } = pipelineSchedule;
              const isActive = ScheduleStatusEnum.ACTIVE === status;
              const isCustomInterval = checkIfCustomInterval(scheduleInterval);
              const finalPipelineUUID = pipelineUUID || triggerPipelineUUID;
              toggleTriggerRefs.current[id] = createRef();
              deleteButtonRefs.current[id] = createRef();

              const triggerAsCodeIcon = pipelineTriggersByName?.[name]
                ? (
                  <>
                    <Spacing mr={1} />

                    <Tooltip
                      block
                      label="This trigger is saved in code."
                      size={ICON_SIZE}
                      widthFitContent
                    >
                      <Code
                        default
                        size={ICON_SIZE}
                      />
                    </Tooltip>
                  </>
                ): null;

              const rows = [];

              if (!disableActions) {
                rows.push(...[
                  <Tooltip
                    block
                    key={`trigger_enabled_${idx}`}
                    label={status}
                    size={20}
                    widthFitContent
                  >
                    <div ref={toggleTriggerRefs.current[id]} style={{ position: 'relative' }}>
                      <ToggleSwitch
                        checked={isActive}
                        compact
                        onCheck={(event) => handleTogglePipeline({
                          event,
                          inProgressRunsCount,
                          pipelineIsActive: isActive,
                          pipelineScheduleId: id,
                          pipelineUuid: triggerPipelineUUID,
                        })}
                        purpleBackground
                      />
                    </div>
                  </Tooltip>,
                  <FlexContainer
                    alignItems="center"
                    key={`trigger_name_${idx}`}
                  >
                    <NextLink
                      as={`/pipelines/${finalPipelineUUID}/triggers/${id}`}
                      href={'/pipelines/[pipeline]/triggers/[...slug]'}
                      passHref
                    >
                      <Link
                        bold
                        onClick={(e) => {
                          pauseEvent(e);
                          router.push(
                            '/pipelines/[pipeline]/triggers/[...slug]',
                            `/pipelines/${finalPipelineUUID}/triggers/${id}`,
                          );
                        }}
                        sky
                      >
                        {name}
                      </Link>
                    </NextLink>
                    {triggerAsCodeIcon}
                  </FlexContainer>,
                ]);
              } else {
                rows.push(...[
                  <FlexContainer
                    alignItems="center"
                    key={`trigger_name_${idx}`}
                  >
                    <Text bold>
                      {name}
                    </Text>
                    {triggerAsCodeIcon}
                  </FlexContainer>,
                ]);
              }

              if (!disableActions) {
                rows.push(
                  <Button
                    default
                    iconOnly
                    key={`logs_button_${idx}`}
                    noBackground
                    onClick={() => router.push(
                      `/pipelines/${finalPipelineUUID}/logs?pipeline_schedule_id[]=${id}`,
                    )}
                  >
                    <Logs default size={ICON_SIZE_SMALL} />
                  </Button>,
                );

                if (projectPlatformActivated) {
                  rows.push(...[
                    <Text
                      default
                      key={`project_${idx}`}
                      monospace
                    >
                      {repoPath?.replace(statusProject?.repo_path_root || '', '')?.slice(1)}
                    </Text>,
                  ]);
                }

                if (includePipelineColumn) {
                  rows.push(
                    <Text
                      default
                      key={`pipeline_name_${idx}`}
                      monospace
                    >
                      {finalPipelineUUID}
                    </Text>,
                  );
                }

                rows.push(...[
                  <Text
                    default
                    key={`trigger_type_${idx}`}
                    monospace
                  >
                    {SCHEDULE_TYPE_TO_LABEL[pipelineSchedule.schedule_type]?.()}
                  </Text>,
                  <Text default key={`trigger_frequency_${idx}`} monospace>
                    {(displayLocalTimezone && isCustomInterval)
                      ? convertUtcCronExpressionToLocalTimezone(scheduleInterval)
                      : scheduleInterval
                    }
                  </Text>,
                ]);
              }

              rows.push(...[
                <Text
                  {...getRunStatusTextProps(lastPipelineRunStatus)}
                  key={`latest_run_status_${idx}`}
                >
                  {lastPipelineRunStatus || '—'}
                </Text>,
                <Text
                  key={`trigger_next_run_date_${idx}`}
                  monospace
                  small
                  title={nextRunDate ? `UTC: ${nextRunDate.slice(0, 19)}` : null}
                >
                  {nextRunDate
                    ? (displayLocalTimezone
                      ? datetimeInLocalTimezone(nextRunDate, displayLocalTimezone)
                      : dateFormatLong(
                        nextRunDate,
                        { includeSeconds: true, utcFormat: true },
                      )
                    ): (
                      <>&#8212;</>
                    )
                  }
                </Text>,
                <Text default key={`trigger_run_count_${idx}`} monospace>
                  {pipelineRunsCount || '0'}
                </Text>,
                <Text
                  default
                  key={`trigger_description_${idx}`}
                  title={description}
                  width={UNIT * 40}
                >
                  {description}
                </Text>,
              ]);

              if (!disableActions) {
                rows.push(
                  <div key={`pipeline_tags_${idx}`}>
                    <TagsContainer
                      tags={tags?.map(tag => ({ uuid: tag }))}
                    />
                  </div>,
                );

                if (includeCreatedAtColumn) {
                  rows.push(
                    <Text
                      default
                      key={`created_at_${idx}`}
                      monospace
                      small
                      title={createdAt ? utcStringToElapsedTime(createdAt) : null}
                    >
                      {datetimeInLocalTimezone(createdAt?.slice(0, 19), displayLocalTimezone)}
                    </Text>,
                  );
                }

                if (!isViewer(router?.basePath)) {
                  rows.push(
                    <FlexContainer key={`edit_delete_buttons_${idx}`}>
                      <Button
                        default
                        iconOnly
                        noBackground
                        onClick={() => router.push(`/pipelines/${finalPipelineUUID}/triggers/${id}/edit`)}
                        title="Edit"
                      >
                        <Edit default size={ICON_SIZE_SMALL} />
                      </Button>
                      <Spacing mr={1} />
                      <Button
                        default
                        iconOnly
                        noBackground
                        onClick={() => {
                          setDeleteConfirmationOpenIdx(id);
                          setConfirmDialogueTopOffset(deleteButtonRefs.current[id]?.current?.offsetTop || 0);
                          setConfirmDialogueLeftOffset(deleteButtonRefs.current[id]?.current?.offsetLeft || 0);
                        }}
                        ref={deleteButtonRefs.current[id]}
                        title="Delete"
                      >
                        <Trash default size={ICON_SIZE_SMALL} />
                      </Button>
                      <ClickOutside
                        onClickOutside={() => setDeleteConfirmationOpenIdx(null)}
                        open={deleteConfirmationOpenIdx === id}
                      >
                        <PopupMenu
                          danger
                          left={(confirmDialogueLeftOffset || 0) - DELETE_CONFIRM_LEFT_OFFSET_DIFF}
                          onCancel={() => setDeleteConfirmationOpenIdx(null)}
                          onClick={() => {
                            setDeleteConfirmationOpenIdx(null);
                            deletePipelineTrigger(id);
                          }}
                          title={`Are you sure you want to delete the trigger ${name}?`}
                          top={(confirmDialogueTopOffset || 0)
                            - (idx <= 1 ? DELETE_CONFIRM_TOP_OFFSET_DIFF_FIRST : DELETE_CONFIRM_TOP_OFFSET_DIFF)
                          }
                          width={DELETE_CONFIRM_WIDTH}
                        />
                      </ClickOutside>
                    </FlexContainer>,
                  );
                }
              }

              return rows;
            })}
            stickyHeader={stickyHeader}
            uuid="pipeline-triggers"
          />
      }
    </TableContainerStyle>
  );
}

export default TriggersTable;

