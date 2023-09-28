import NextLink from 'next/link';
import { createRef, useRef, useState } from 'react';
import { useMutation } from 'react-query';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineType from '@interfaces/PipelineType';
import PipelineScheduleType, {
  SCHEDULE_TYPE_TO_LABEL,
  ScheduleStatusEnum,
} from '@interfaces/PipelineScheduleType';
import PipelineTriggerType from '@interfaces/PipelineTriggerType';
import PopupMenu from '@oracle/components/PopupMenu';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import TagsContainer from '@components/Tags/TagsContainer';
import Text from '@oracle/elements/Text';
import ToggleSwitch from '@oracle/elements/Inputs/ToggleSwitch';
import Tooltip from '@oracle/components/Tooltip';
import api from '@api';
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
} from '@components/shared/Table/constants';
import { ICON_SIZE_SMALL } from '@oracle/styles/units/icons';
import { RunStatus } from '@interfaces/BlockRunType';
import { UNIT } from '@oracle/styles/units/spacing';
import { TableContainerStyle } from '@components/shared/Table/index.style';
import {
  checkIfCustomInterval,
  convertUtcCronExpressionToLocalTimezone,
} from './utils';
import { dateFormatLong, datetimeInLocalTimezone } from '@utils/date';
import { isViewer } from '@utils/session';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';

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
  const deleteButtonRefs = useRef({});
  const [deleteConfirmationOpenIdx, setDeleteConfirmationOpenIdx] = useState<number>(null);
  const [confirmDialogueTopOffset, setConfirmDialogueTopOffset] = useState<number>(0);
  const [confirmDialogueLeftOffset, setConfirmDialogueLeftOffset] = useState<number>(0);

  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const timezoneTooltipProps = displayLocalTimezone ? TIMEZONE_TOOLTIP_PROPS : {};

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
          onErrorCallback: (response, errors) => setErrors({
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
    columnFlex.push(...[null, null]);
    columns.push(...[
      {
        uuid: 'Active',
      },
      {
        uuid: 'Type',
      },
    ]);
  }

  columnFlex.push(...[1, 2]);
  columns.push(...[
    {
      uuid: 'Name',
    },
    {
      uuid: 'Description',
    },
  ]);

  if (!disableActions) {
    columnFlex.push(...[null]);
    columns.push({
      uuid: 'Frequency',
    });
  }

  columnFlex.push(...[1, 1,  null]);
  columns.push(...[
    {
      ...timezoneTooltipProps,
      uuid: 'Next run date',
    },
    {
      uuid: 'Latest status',
    },
    {
      uuid: 'Runs',
    },
  ]);

  if (!disableActions) {
    columnFlex.push(...[1]);
    columns.push({
      uuid: 'Tags',
    });
  }

  columnFlex.push(...[null]);
  columns.push({
    uuid: 'Logs',
  });

  if (!disableActions && !isViewer()) {
    columnFlex.push(...[null]);
    columns.push({
      label: () => '',
      uuid: 'edit/delete',
    });
  }

  if (!disableActions && includePipelineColumn) {
    columns.splice(2, 0, { uuid: 'Pipeline' });
    columnFlex.splice(2, 0, 1);
  }
  if (!disableActions && includeCreatedAtColumn) {
    columns.splice(5, 0, { ...timezoneTooltipProps, uuid: 'Created at' });
    columnFlex.splice(5, 0, null);
  }

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
                pipeline_runs_count: pipelineRunsCount,
                pipeline_uuid: triggerPipelineUUID,
                last_pipeline_run_status: lastPipelineRunStatus,
                name,
                schedule_interval: scheduleInterval,
                status,
                tags,
              } = pipelineSchedule;
              const isActive = ScheduleStatusEnum.ACTIVE === status;
              const isCustomInterval = checkIfCustomInterval(scheduleInterval);
              const finalPipelineUUID = pipelineUUID || triggerPipelineUUID;
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
                    <ToggleSwitch
                      checked={isActive}
                      compact
                      onCheck={(e) => {
                        pauseEvent(e);
                        updatePipelineSchedule({
                          id: pipelineSchedule.id,
                          status: isActive
                            ? ScheduleStatusEnum.INACTIVE
                            : ScheduleStatusEnum.ACTIVE,
                        });
                      }}
                      purpleBackground
                    />
                  </Tooltip>,
                  <Text
                    default
                    key={`trigger_type_${idx}`}
                    monospace
                  >
                    {SCHEDULE_TYPE_TO_LABEL[pipelineSchedule.schedule_type]?.()}
                  </Text>,
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

              rows.push(...[
                <Text
                  default
                  key={`trigger_description_${idx}`}
                >
                  {description}
                </Text>,
              ]);

              if (!disableActions) {
                rows.push(
                  <Text default key={`trigger_frequency_${idx}`} monospace>
                    {(displayLocalTimezone && isCustomInterval)
                      ? convertUtcCronExpressionToLocalTimezone(scheduleInterval)
                      : scheduleInterval
                    }
                  </Text>,
                );
              }

              rows.push(...[
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
                <Text
                  danger={RunStatus.FAILED === lastPipelineRunStatus}
                  default={!lastPipelineRunStatus}
                  key={`latest_run_status_${idx}`}
                  monospace
                  success={RunStatus.COMPLETED === lastPipelineRunStatus}
                  warning={RunStatus.CANCELLED === lastPipelineRunStatus}
                >
                  {lastPipelineRunStatus || 'N/A'}
                </Text>,
                <Text default key={`trigger_run_count_${idx}`} monospace>
                  {pipelineRunsCount}
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
              }

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

              if (!disableActions && !isViewer()) {
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

              if (!disableActions && includePipelineColumn) {
                rows.splice(
                  2,
                  0,
                  <Text
                    default
                    key={`pipeline_name_${idx}`}
                    monospace
                  >
                    {finalPipelineUUID}
                  </Text>,
                );
              }
              if (!disableActions && includeCreatedAtColumn) {
                rows.splice(
                  5,
                  0,
                  <Text
                    default
                    key={`created_at_${idx}`}
                    monospace
                    small
                    title={createdAt ? `UTC: ${createdAt.slice(0, 19)}` : null}
                  >
                    {datetimeInLocalTimezone(createdAt?.slice(0, 19), displayLocalTimezone)}
                  </Text>,
                );
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

