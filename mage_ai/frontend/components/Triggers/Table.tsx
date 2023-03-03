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
import PopupMenu from '@oracle/components/PopupMenu';
import Spacing from '@oracle/elements/Spacing';
import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';

import {
  Edit,
  Pause,
  PlayButtonFilled,
  TodoList,
  Trash,
} from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { TableContainerStyle } from '@components/shared/Table/index.style';
import { isViewer } from '@utils/session';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';

type TriggersTableProps = {
  fetchPipelineSchedules: () => void;
  highlightRowOnHover?: boolean;
  includeCreatedAtColumn?: boolean;
  includePipelineColumn?: boolean;
  pipeline?: PipelineType;
  pipelineSchedules: PipelineScheduleType[];
  selectedSchedule?: PipelineScheduleType;
  setErrors?: (errors: any) => void;
  setSelectedSchedule?: (schedule: PipelineScheduleType) => void;
  stickyHeader?: boolean;
};

function TriggersTable({
  fetchPipelineSchedules,
  highlightRowOnHover,
  includeCreatedAtColumn,
  includePipelineColumn,
  pipeline,
  pipelineSchedules,
  selectedSchedule,
  setErrors,
  setSelectedSchedule,
  stickyHeader,
}: TriggersTableProps) {
  const pipelineUUID = pipeline?.uuid;
  const router = useRouter();
  const deleteButtonRefs = useRef({});
  const [deleteConfirmationOpenIdx, setDeleteConfirmationOpenIdx] = useState<string>(null);
  const [confirmDialogueTopOffset, setConfirmDialogueTopOffset] = useState<number>(0);
  const [confirmDialogueLeftOffset, setConfirmDialogueLeftOffset] = useState<number>(0);

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
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
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
            if (pipelineUUID) {
              router.push(
                '/pipelines/[pipeline]/triggers',
                `/pipelines/${pipelineUUID}/triggers`,
              );
            } else {
              fetchPipelineSchedules();
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

  const columns = [
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
      uuid: 'Latest run status',
    },
    {
      uuid: 'Logs',
    },
  ];

  if (!isViewer()) {
    columns.push({
      label: () => '',
      uuid: 'edit/delete',
    });
  }

  const columnFlex = [null, 1, 1, 3, 1, null, null, null, null];

  if (includePipelineColumn) {
    columns.splice(2, 0, { uuid: 'Pipeline' });
    columnFlex.splice(2, 0, 2);
  }
  if (includeCreatedAtColumn) {
    columns.splice(3, 0, { uuid: 'Created at' });
    columnFlex.splice(3, 0, null);
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
                pipeline_runs_count: pipelineRunsCount,
                pipeline_uuid: triggerPipelineUUID,
                last_pipeline_run_status: lastPipelineRunStatus,
                name,
                schedule_interval: scheduleInterval,
                status,
              } = pipelineSchedule;
              const finalPipelineUUID = pipelineUUID || triggerPipelineUUID;
              deleteButtonRefs.current[id] = createRef();

              const rows = [
                <Button
                  iconOnly
                  key={`toggle_trigger_${idx}`}
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
                  key={`trigger_status_${idx}`}
                  monospace
                  success={ScheduleStatusEnum.ACTIVE === status}
                >
                  {status}
                </Text>,
                <Text
                  default
                  key={`trigger_type_${idx}`}
                  monospace
                >
                  {SCHEDULE_TYPE_TO_LABEL[pipelineSchedule.schedule_type]?.()}
                </Text>,
                <NextLink
                  as={`/pipelines/${finalPipelineUUID}/triggers/${id}`}
                  href={'/pipelines/[pipeline]/triggers/[...slug]'}
                  key={`trigger_name_${idx}`}
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
                    sameColorAsText
                  >
                    {name}
                  </Link>
                </NextLink>,
                <Text default key={`trigger_frequency_${idx}`} monospace>
                  {scheduleInterval}
                </Text>,
                <Text default key={`trigger_run_count_${idx}`} monospace>
                  {pipelineRunsCount}
                </Text>,
                <Text default key={`latest_run_status_${idx}`} monospace>
                  {lastPipelineRunStatus || 'N/A'}
                </Text>,
                <Button
                  default
                  iconOnly
                  key={`logs_button_${idx}`}
                  noBackground
                  onClick={() => router.push(
                    `/pipelines/${finalPipelineUUID}/logs?pipeline_schedule_id[]=${id}`,
                  )}
                >
                  <TodoList default size={2 * UNIT} />
                </Button>,
              ];

              if (!isViewer()) {
                rows.push(
                  <FlexContainer key={`edit_delete_buttons_${idx}`}>
                    <Button
                      default
                      iconOnly
                      noBackground
                      onClick={() => router.push(`/pipelines/${finalPipelineUUID}/triggers/${id}/edit`)}
                      title="Edit"
                    >
                      <Edit default size={2 * UNIT} />
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
                      <Trash default size={2 * UNIT} />
                    </Button>
                    <ClickOutside
                      onClickOutside={() => setDeleteConfirmationOpenIdx(null)}
                      open={deleteConfirmationOpenIdx === id}
                    >
                      <PopupMenu
                        danger
                        left={(confirmDialogueLeftOffset || 0) - 286}
                        onCancel={() => setDeleteConfirmationOpenIdx(null)}
                        onClick={() => {
                          setDeleteConfirmationOpenIdx(null);
                          deletePipelineTrigger(id);
                        }}
                        title={`Are you sure you want to delete the trigger ${name}?`}
                        top={(confirmDialogueTopOffset || 0) - (idx <= 1 ? 40 : 96)}
                        width={UNIT * 40}
                      />
                    </ClickOutside>
                  </FlexContainer>,
                );
              }

              if (includePipelineColumn) {
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
              if (includeCreatedAtColumn) {
                rows.splice(
                  3,
                  0,
                  <Text
                    default
                    key={`created_at_${idx}`}
                    monospace
                  >
                    {createdAt}
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

