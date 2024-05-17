import NextLink from 'next/link';
import { MutateFunction, useMutation } from 'react-query';
import { createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';

import Button from '@oracle/elements/Button';
import Checkbox from '@oracle/elements/Checkbox';
import ClickOutside from '@oracle/components/ClickOutside';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineRunType, { RunStatus, RUN_STATUS_TO_LABEL } from '@interfaces/PipelineRunType';
import PopupMenu from '@oracle/components/PopupMenu';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table, { ColumnType } from '@components/shared/Table';
import TagsContainer from '@components/Tags/TagsContainer';
import Text from '@oracle/elements/Text';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { Check, ChevronRight, Logs, PlayButtonFilled, Subitem, Trash } from '@oracle/icons';
import {
  DELETE_CONFIRM_WIDTH,
  DELETE_CONFIRM_LEFT_OFFSET_DIFF,
  DELETE_CONFIRM_TOP_OFFSET_DIFF,
  DELETE_CONFIRM_TOP_OFFSET_DIFF_FIRST,
  TIMEZONE_TOOLTIP_PROPS,
  getTableRowUuid,
} from '@components/shared/Table/constants';
import { ICON_SIZE_SMALL } from '@oracle/styles/units/icons';
import { KEY_CODE_ARROW_DOWN, KEY_CODE_ARROW_UP } from '@utils/hooks/keyboardShortcuts/constants';
import { PopupContainerStyle } from './Table.style';
import { ScheduleTypeEnum } from '@interfaces/PipelineScheduleType';
import { TableContainerStyle } from '@components/shared/Table/index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { displayLocalOrUtcTime } from '@components/Triggers/utils';
import { indexBy } from '@utils/array';
import { isViewer } from '@utils/session';
import { onSuccess } from '@api/utils/response';
import { pauseEvent } from '@utils/events';
import { queryFromUrl } from '@utils/url';
import { shouldDisplayLocalTimezone } from '@components/settings/workspace/utils';
import { timeDifference, utcStringToElapsedTime } from '@utils/date';
import { useKeyboardContext } from '@context/Keyboard';

const SHARED_DATE_FONT_PROPS = {
  monospace: true,
  small: true,
};

function RetryButton({
  cancelingRunId,
  disabled,
  isLoadingCancelPipeline,
  onCancel,
  onSuccess: onSuccessProp,
  pipelineRun,
  setCancelingRunId,
  setErrors,
  setShowConfirmationId,
  showConfirmationId,
}: {
  cancelingRunId: number;
  disabled?: boolean;
  isLoadingCancelPipeline: boolean;
  onCancel: (run: PipelineRunType) => void;
  onSuccess: () => void;
  pipelineRun: PipelineRunType;
  setCancelingRunId: (id: number) => void;
  setErrors?: (errors: ErrorsType) => void;
  setShowConfirmationId: (showConfirmationId: number) => void;
  showConfirmationId: number;
}) {
  const isViewerRole = isViewer();
  const {
    id: pipelineRunId,
    pipeline_schedule_id: pipelineScheduleId,
    pipeline_schedule_token: pipelineScheduleToken,
    pipeline_schedule_type: pipelineScheduleType,
    status,
  } = pipelineRun || {};
  const isCancelingPipeline =
    isLoadingCancelPipeline && pipelineRunId === cancelingRunId && RunStatus.RUNNING === status;

  const q = queryFromUrl();
  const isNotFirstPage = useMemo(() => {
    const page = q?.page ? +q.page : 0;

    return page > 0;
  }, [q?.page]);

  const [createPipelineRun]: any = useMutation(
    ScheduleTypeEnum.API === pipelineScheduleType && pipelineScheduleToken
      ? api.pipeline_runs.pipeline_schedules.useCreateWithParent(
          pipelineScheduleId,
          pipelineScheduleToken,
        )
      : api.pipeline_runs.pipeline_schedules.useCreate(pipelineScheduleId),
    {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: () => {
            if (onSuccessProp) {
              onSuccessProp?.();
            }
          },
          onErrorCallback: (response, errors) =>
            setErrors?.({
              errors,
              response,
            }),
        }),
    },
  );

  const retryPipelineRun = useCallback(() => {
    setShowConfirmationId(null);
    createPipelineRun({
      pipeline_run: {
        backfill_id: pipelineRun?.backfill_id,
        event_variables: pipelineRun?.event_variables || {},
        execution_date: pipelineRun?.execution_date,
        pipeline_schedule_id: pipelineRun?.pipeline_schedule_id,
        pipeline_uuid: pipelineRun?.pipeline_uuid,
        variables: pipelineRun?.variables || {},
      },
    });
  }, [createPipelineRun, pipelineRun, setShowConfirmationId]);

  const cancelPipelineRun = useCallback(() => {
    setShowConfirmationId(null);
    setCancelingRunId(pipelineRunId);
    onCancel({
      id: pipelineRunId,
      status: RunStatus.CANCELLED,
    });
  }, [onCancel, pipelineRunId, setCancelingRunId, setShowConfirmationId]);

  return (
    <div
      style={{
        position: 'relative',
      }}
    >
      <Button
        backgroundColor={isCancelingPipeline && dark.accent.yellow}
        beforeIcon={
          RunStatus.INITIAL !== status &&
          !disabled && (
            <>
              {RunStatus.COMPLETED === status && <Check size={ICON_SIZE_SMALL} />}
              {[RunStatus.FAILED, RunStatus.CANCELLED].includes(status) && (
                <PlayButtonFilled
                  inverted={RunStatus.CANCELLED === status && !isViewerRole}
                  size={ICON_SIZE_SMALL}
                />
              )}
              {[RunStatus.RUNNING].includes(status) && (
                <Spinner
                  color={isCancelingPipeline ? dark.status.negative : dark.monotone.white}
                  small
                />
              )}
            </>
          )
        }
        borderRadius={`${BORDER_RADIUS_XXXLARGE}px`}
        danger={RunStatus.FAILED === status && !isViewerRole}
        default={RunStatus.INITIAL === status}
        disabled={disabled || isViewerRole}
        loading={!pipelineRun}
        onClick={e => {
          // Stop table row from being highlighted as well
          e.stopPropagation();
          setShowConfirmationId(pipelineRunId);
        }}
        padding="6px"
        primary={RunStatus.RUNNING === status && !isCancelingPipeline && !isViewerRole}
        warning={RunStatus.CANCELLED === status && !isViewerRole}
      >
        {disabled ? 'Ready' : isCancelingPipeline ? 'Canceling' : RUN_STATUS_TO_LABEL[status]}
      </Button>
      <ClickOutside
        onClickOutside={() => setShowConfirmationId(null)}
        open={showConfirmationId === pipelineRunId}
      >
        <PopupContainerStyle>
          {[RunStatus.RUNNING, RunStatus.INITIAL].includes(status) && (
            <>
              <Text bold color="#9ECBFF">
                Run is in progress
              </Text>
              <Spacing mb={1} />
              <Text>
                This pipeline run is currently ongoing. Retrying will cancel
                <br />
                the current pipeline run.
              </Text>
              <Text></Text>
              <Spacing mt={1}>
                <FlexContainer>
                  <Button
                    onClick={() => {
                      cancelPipelineRun();
                      retryPipelineRun();
                    }}
                  >
                    Retry run
                  </Button>
                  <Spacing ml={1} />
                  <Button onClick={cancelPipelineRun}>Cancel run</Button>
                </FlexContainer>
              </Spacing>
            </>
          )}
          {[RunStatus.CANCELLED, RunStatus.FAILED, RunStatus.COMPLETED].includes(status) && (
            <>
              <Text bold color="#9ECBFF">
                Run {status}
              </Text>
              <Spacing mb={1} />
              <Text>
                Retry the run with changes you have made to the pipeline.
                {isNotFirstPage ? (
                  <>
                    <br />
                    Note that the retried run may appear on a previous page.
                  </>
                ) : null}
              </Text>
              <Spacing mb={1} />
              <Button onClick={retryPipelineRun}>Retry run</Button>
            </>
          )}
        </PopupContainerStyle>
      </ClickOutside>
    </div>
  );
}

type PipelineRunsTableProps = {
  allowBulkSelect?: boolean;
  allowDelete?: boolean;
  deletePipelineRun?: MutateFunction<any>;
  disableKeyboardNav?: boolean;
  disableRowSelect?: boolean;
  emptyMessage?: string;
  fetchPipelineRuns?: () => void;
  hidePipelineColumn?: boolean;
  hideTriggerColumn?: boolean;
  includePipelineTags?: boolean;
  onClickRow?: (rowIndex: number) => void;
  pipelineRuns: PipelineRunType[];
  selectedRun?: PipelineRunType;
  selectedRuns?: { [keyof: string]: PipelineRunType };
  setSelectedRun?: (selectedRun: any) => void;
  setSelectedRuns?: (selectedRuns: any) => void;
  setErrors?: (errors: ErrorsType) => void;
};

function PipelineRunsTable({
  allowBulkSelect,
  allowDelete,
  deletePipelineRun,
  disableKeyboardNav,
  disableRowSelect,
  emptyMessage = 'No runs available',
  fetchPipelineRuns,
  hidePipelineColumn,
  hideTriggerColumn,
  includePipelineTags,
  onClickRow,
  pipelineRuns,
  selectedRun,
  selectedRuns,
  setSelectedRun,
  setSelectedRuns,
  setErrors,
}: PipelineRunsTableProps) {
  const router = useRouter();
  const isViewerRole = isViewer();
  const displayLocalTimezone = shouldDisplayLocalTimezone();
  const deleteButtonRefs = useRef({});
  const [cancelingRunId, setCancelingRunId] = useState<number>(null);
  const [showConfirmationId, setShowConfirmationId] = useState<number>(null);
  const [deleteConfirmationOpenIdx, setDeleteConfirmationOpenIdx] = useState<number>(null);
  const [confirmDialogueTopOffset, setConfirmDialogueTopOffset] = useState<number>(0);
  const [confirmDialogueLeftOffset, setConfirmDialogueLeftOffset] = useState<number>(0);
  const [updatePipelineRun, { isLoading: isLoadingCancelPipeline }] = useMutation(
    ({ id, status }: PipelineRunType) =>
      api.pipeline_runs.useUpdate(id)({
        pipeline_run: {
          status,
        },
      }),
    {
      onSuccess: (response: any) =>
        onSuccess(response, {
          callback: () => {
            setCancelingRunId(null);
            fetchPipelineRuns?.();
          },
          onErrorCallback: (response, errors) => {
            setCancelingRunId(null);
            setErrors?.({
              errors,
              response,
            });
          },
        }),
    },
  );

  const uuidKeyboard = 'PipelineDetail/Runs/Table';
  const uuidTable = 'pipeline-runs';

  const getRunRowIndex = useCallback(
    (run: PipelineRunType) => {
      if (!run) return null;

      const rowIndex = pipelineRuns.findIndex(pipelineRun => pipelineRun.id === run.id);
      return rowIndex >= 0 ? rowIndex : null;
    },
    [pipelineRuns],
  );

  const { registerOnKeyDown, unregisterOnKeyDown } = useKeyboardContext();

  useEffect(
    () => () => {
      unregisterOnKeyDown(uuidKeyboard);
    },
    [unregisterOnKeyDown, uuidKeyboard],
  );

  registerOnKeyDown(
    uuidKeyboard,
    (event, keyMapping) => {
      const upPressed = keyMapping[KEY_CODE_ARROW_UP];
      const downPressed = keyMapping[KEY_CODE_ARROW_DOWN];

      if (setSelectedRun && !disableKeyboardNav && (upPressed || downPressed)) {
        setSelectedRun(prevSelectedRun => {
          const prevRowIndex = getRunRowIndex(prevSelectedRun);
          if (prevRowIndex !== null) {
            // This disables the default auto-scrolling response to the up/down arrow keys
            if (event.repeat) {
              event.preventDefault();
              return prevSelectedRun;
            }

            if (upPressed) {
              let newRowIndex = prevRowIndex - 1;
              if (newRowIndex < 0) {
                newRowIndex = pipelineRuns.length - 1;
              }
              return pipelineRuns[newRowIndex];
            } else if (downPressed) {
              let newRowIndex = prevRowIndex + 1;
              if (newRowIndex >= pipelineRuns.length) {
                newRowIndex = 0;
              }
              return pipelineRuns[newRowIndex];
            }
          }

          return prevSelectedRun;
        });
      }
    },
    [pipelineRuns, setSelectedRun],
  );

  useEffect(() => {
    const rowIndex = getRunRowIndex(selectedRun);
    if (rowIndex !== null) {
      const tableRowUuid = getTableRowUuid({ rowIndex, uuid: uuidTable });
      const newSelectedRow = document.getElementById(tableRowUuid);
      if (newSelectedRow) {
        newSelectedRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [getRunRowIndex, selectedRun]);

  const timezoneTooltipProps = displayLocalTimezone ? TIMEZONE_TOOLTIP_PROPS : {};
  const columnFlex = [null, null, null, null];
  const columns: ColumnType[] = [
    {
      uuid: 'Status',
    },
    {
      center: true,
      uuid: 'Logs',
    },
    {
      center: true,
      uuid: 'ID',
    },
    {
      uuid: 'Block runs',
    },
  ];

  if (!hidePipelineColumn) {
    columnFlex.push(1);
    columns.push({
      uuid: 'Pipeline',
    });
  }

  if (!hideTriggerColumn) {
    columnFlex.push(1);
    columns.push({
      uuid: 'Trigger',
    });
  }

  if (includePipelineTags) {
    columnFlex.push(null);
    columns.push({
      uuid: 'Pipeline tags',
    });
  }

  columnFlex.push(...[1, 1, 1, null, null]);
  columns.push(
    ...[
      {
        ...timezoneTooltipProps,
        uuid: 'Execution date',
      },
      {
        ...timezoneTooltipProps,
        uuid: 'Started at',
      },
      {
        ...timezoneTooltipProps,
        uuid: 'Completed at',
      },
      {
        uuid: 'Execution time',
      },
    ],
  );

  if (allowDelete && !isViewerRole) {
    columnFlex.push(...[null]);
    columns.push({
      label: () => '',
      uuid: 'Delete',
    });
  }

  const allRunsSelected = useMemo(
    () => pipelineRuns.every(({ id }) => !!selectedRuns?.[id]),
    [pipelineRuns, selectedRuns],
  );
  if (allowBulkSelect) {
    columnFlex.unshift(null);
    columns.unshift({
      label: () => (
        <Checkbox
          checked={allRunsSelected}
          onClick={() => {
            const allRunsIndexed = indexBy(pipelineRuns || [], ({ id }) => id);
            if (allRunsSelected) {
              setSelectedRuns({});
            } else {
              setSelectedRuns(allRunsIndexed);
            }
          }}
        />
      ),
      uuid: 'Selected',
    });
  }

  if (!disableRowSelect && onClickRow) {
    columnFlex.push(null);
    columns.push({
      label: () => '',
      uuid: 'action',
    });
  }

  const handleOnClickRow = useCallback(
    (rowIndex: number, event: any) => {
      if (onClickRow && setSelectedRuns && event && event.metaKey) {
        const pipelineRun = pipelineRuns[rowIndex];
        setSelectedRuns(prevRuns => {
          const selected = !!prevRuns?.[pipelineRun.id];
          return {
            ...prevRuns,
            [pipelineRun.id]: selected ? null : pipelineRun,
          };
        });
      } else if (onClickRow) {
        onClickRow(rowIndex);
      }
    },
    [onClickRow, pipelineRuns, setSelectedRuns],
  );

  return (
    <TableContainerStyle minHeight={UNIT * 30} overflowVisible={!!showConfirmationId}>
      {pipelineRuns?.length === 0 ? (
        <Spacing px={3} py={1}>
          <Text bold default monospace muted>
            {emptyMessage}
          </Text>
        </Spacing>
      ) : (
        <Table
          columnFlex={columnFlex}
          columns={columns}
          isSelectedRow={(rowIndex: number) =>
            disableRowSelect ? false : pipelineRuns[rowIndex].id === selectedRun?.id
          }
          onClickRow={disableRowSelect ? null : handleOnClickRow}
          rowVerticalPadding={6}
          rows={pipelineRuns?.map((pipelineRun, index) => {
            const {
              block_runs_count: blockRunsCount,
              completed_block_runs_count: completedBlockRunsCount,
              completed_at: completedAt,
              execution_date: executionDate,
              id,
              pipeline_schedule_id: pipelineScheduleId,
              pipeline_schedule_name: pipelineScheduleName,
              pipeline_tags: pipelineTags,
              pipeline_uuid: pipelineUUID,
              started_at: startedAt,
              status,
            } = pipelineRun;
            deleteButtonRefs.current[id] = createRef();
            const disabled = !id && !status;
            const blockRunCountTooltipMessage = `${completedBlockRunsCount} out of ${blockRunsCount} block runs completed`;

            const tagsEl = (
              <TagsContainer
                key={`row_pipeline_tags_${index}`}
                tags={pipelineTags?.map(tag => ({ uuid: tag }))}
              />
            );

            const isRetry =
              index > 0 &&
              pipelineRuns[index - 1].execution_date === pipelineRun.execution_date &&
              pipelineRuns[index - 1].pipeline_schedule_id === pipelineRun.pipeline_schedule_id;

            let arr = [];
            if (isRetry) {
              arr = [
                <Spacing key="row_status" ml={1}>
                  <FlexContainer alignItems="center">
                    <Subitem size={ICON_SIZE_SMALL} useStroke />
                    <Button borderRadius={`${BORDER_RADIUS_XXXLARGE}px`} notClickable padding="6px">
                      <Text muted>{RUN_STATUS_TO_LABEL[status]}</Text>
                    </Button>
                  </FlexContainer>
                </Spacing>,
                <Button
                  default
                  iconOnly
                  key="row_logs"
                  noBackground
                  onClick={e => {
                    // Stop table row from being highlighted as well
                    e.stopPropagation();
                    router.push(`/pipelines/${pipelineUUID}/logs?pipeline_run_id[]=${id}`);
                  }}
                >
                  <Logs default size={ICON_SIZE_SMALL} />
                </Button>,
                <Text center default key="row_id" monospace muted>
                  {pipelineRun?.id}
                </Text>,
                <NextLink
                  as={`/pipelines/${pipelineUUID}/runs/${id}`}
                  href={'/pipelines/[pipeline]/runs/[run]'}
                  key="row_block_runs"
                  passHref
                >
                  <Link block bold centerAlign muted title={blockRunCountTooltipMessage}>
                    {`${completedBlockRunsCount} / ${blockRunsCount}`}
                  </Link>
                </NextLink>,
              ];

              if (!hidePipelineColumn) {
                arr.push(
                  <Text default key="row_pipeline_uuid" monospace muted>
                    {pipelineUUID}
                  </Text>,
                );
              }

              if (!hideTriggerColumn) {
                arr.push(
                  <Text default key="row_trigger_retry" monospace muted>
                    -
                  </Text>,
                );
              }

              if (includePipelineTags) {
                arr.push(tagsEl);
              }

              arr.push(
                ...[
                  <Text default key="row_date_retry" monospace muted>
                    -
                  </Text>,
                  <Text
                    {...SHARED_DATE_FONT_PROPS}
                    key="row_started_at"
                    muted
                    title={startedAt ? utcStringToElapsedTime(startedAt) : null}
                  >
                    {startedAt ? (
                      displayLocalOrUtcTime(startedAt, displayLocalTimezone)
                    ) : (
                      <>&#8212;</>
                    )}
                  </Text>,
                  <Text
                    {...SHARED_DATE_FONT_PROPS}
                    key="row_completed_at"
                    muted
                    title={completedAt ? utcStringToElapsedTime(completedAt) : null}
                  >
                    {completedAt ? (
                      displayLocalOrUtcTime(completedAt, displayLocalTimezone)
                    ) : (
                      <>&#8212;</>
                    )}
                  </Text>,
                  <Text
                    {...SHARED_DATE_FONT_PROPS}
                    default
                    key="row_execution_time"
                    title={
                      startedAt && completedAt
                        ? timeDifference({
                            endDatetime: completedAt,
                            showFullFormat: true,
                            startDatetime: startedAt,
                          })
                        : null
                    }
                  >
                    {startedAt && completedAt ? (
                      timeDifference({ endDatetime: completedAt, startDatetime: startedAt })
                    ) : (
                      <>&#8212;</>
                    )}
                  </Text>,
                ],
              );
            } else {
              arr = [
                <RetryButton
                  cancelingRunId={cancelingRunId}
                  disabled={disabled}
                  isLoadingCancelPipeline={isLoadingCancelPipeline}
                  key="row_retry_button"
                  onCancel={updatePipelineRun}
                  onSuccess={fetchPipelineRuns}
                  pipelineRun={pipelineRun}
                  setCancelingRunId={setCancelingRunId}
                  setErrors={setErrors}
                  setShowConfirmationId={setShowConfirmationId}
                  showConfirmationId={showConfirmationId}
                />,
                <Button
                  default
                  disabled={disabled}
                  iconOnly
                  key="row_logs"
                  noBackground
                  onClick={e => {
                    // Stop table row from being highlighted as well
                    e.stopPropagation();
                    router.push(`/pipelines/${pipelineUUID}/logs?pipeline_run_id[]=${id}`);
                  }}
                >
                  <Logs default size={ICON_SIZE_SMALL} />
                </Button>,
                <Text center default key="row_id" monospace muted>
                  {pipelineRun?.id}
                </Text>,
                <NextLink
                  as={`/pipelines/${pipelineUUID}/runs/${id}`}
                  href={'/pipelines/[pipeline]/runs/[run]'}
                  key="row_block_runs"
                  passHref
                >
                  <Link
                    block
                    bold
                    centerAlign
                    disabled={disabled}
                    sky
                    title={blockRunCountTooltipMessage}
                  >
                    {disabled ? '' : `${completedBlockRunsCount} / ${blockRunsCount}`}
                  </Link>
                </NextLink>,
              ];

              if (!hidePipelineColumn) {
                arr.push(
                  <Text default key="row_pipeline_uuid" monospace>
                    {pipelineUUID}
                  </Text>,
                );
              }

              if (!hideTriggerColumn) {
                arr.push(
                  <NextLink
                    as={`/pipelines/${pipelineUUID}/triggers/${pipelineScheduleId}`}
                    href={'/pipelines/[pipeline]/triggers/[...slug]'}
                    key="row_trigger"
                    passHref
                  >
                    <Link bold sky>
                      {pipelineScheduleName}
                    </Link>
                  </NextLink>,
                );
              }

              if (includePipelineTags) {
                arr.push(tagsEl);
              }

              arr.push(
                ...[
                  <Text
                    {...SHARED_DATE_FONT_PROPS}
                    default
                    key="row_date"
                    title={executionDate ? utcStringToElapsedTime(executionDate) : null}
                  >
                    {executionDate ? (
                      displayLocalOrUtcTime(executionDate, displayLocalTimezone)
                    ) : (
                      <>&#8212;</>
                    )}
                  </Text>,
                  <Text
                    {...SHARED_DATE_FONT_PROPS}
                    default
                    key="row_started_at"
                    title={startedAt ? utcStringToElapsedTime(startedAt) : null}
                  >
                    {startedAt ? (
                      displayLocalOrUtcTime(startedAt, displayLocalTimezone)
                    ) : (
                      <>&#8212;</>
                    )}
                  </Text>,
                  <Text
                    {...SHARED_DATE_FONT_PROPS}
                    default
                    key="row_completed_at"
                    title={completedAt ? utcStringToElapsedTime(completedAt) : null}
                  >
                    {completedAt ? (
                      displayLocalOrUtcTime(completedAt, displayLocalTimezone)
                    ) : (
                      <>&#8212;</>
                    )}
                  </Text>,
                  <Text
                    {...SHARED_DATE_FONT_PROPS}
                    default
                    key="row_execution_time"
                    title={
                      startedAt && completedAt
                        ? timeDifference({
                            endDatetime: completedAt,
                            showFullFormat: true,
                            startDatetime: startedAt,
                          })
                        : null
                    }
                  >
                    {startedAt && completedAt ? (
                      timeDifference({ endDatetime: completedAt, startDatetime: startedAt })
                    ) : (
                      <>&#8212;</>
                    )}
                  </Text>,
                ],
              );
            }

            if (allowDelete && !isViewerRole) {
              arr.push(
                <>
                  <Button
                    default
                    iconOnly
                    noBackground
                    onClick={e => {
                      pauseEvent(e);
                      setDeleteConfirmationOpenIdx(id);
                      setConfirmDialogueTopOffset(
                        deleteButtonRefs.current[id]?.current?.offsetTop || 0,
                      );
                      setConfirmDialogueLeftOffset(
                        deleteButtonRefs.current[id]?.current?.offsetLeft || 0,
                      );
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
                        deletePipelineRun(id);
                      }}
                      title={`Are you sure you want to delete this run (id ${id} for trigger "${pipelineScheduleName}")?`}
                      top={
                        (confirmDialogueTopOffset || 0) -
                        (index <= 1
                          ? DELETE_CONFIRM_TOP_OFFSET_DIFF_FIRST
                          : DELETE_CONFIRM_TOP_OFFSET_DIFF)
                      }
                      width={DELETE_CONFIRM_WIDTH}
                    />
                  </ClickOutside>
                </>,
              );
            }

            if (allowBulkSelect) {
              const selected = !!selectedRuns?.[id];
              arr.unshift(
                <Checkbox
                  checked={selected}
                  key={`selected-pipeline-run-${id}`}
                  onClick={e => {
                    // Stop table row from being highlighted as well
                    e.stopPropagation();
                    setSelectedRuns(prev => ({
                      ...prev,
                      [id]: selected ? null : pipelineRun,
                    }));
                  }}
                />,
              );
            }

            if (!disableRowSelect && onClickRow) {
              arr.push(
                <Flex flex={1} justifyContent="flex-end">
                  <ChevronRight default size={ICON_SIZE_SMALL} />
                </Flex>,
              );
            }

            return arr;
          })}
          uuid={uuidTable}
        />
      )}
    </TableContainerStyle>
  );
}

export default PipelineRunsTable;
