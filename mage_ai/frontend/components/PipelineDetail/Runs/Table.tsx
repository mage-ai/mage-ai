import NextLink from 'next/link';
import Router from 'next/router';
import { useCallback, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import ErrorsType from '@interfaces/ErrorsType';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import PipelineRunType, { RunStatus, RUN_STATUS_TO_LABEL } from '@interfaces/PipelineRunType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table, { ColumnType } from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { Check, ChevronRight, PlayButtonFilled, Subitem, TodoList } from '@oracle/icons';
import { PopupContainerStyle } from './Table.style';
import { ScheduleTypeEnum } from '@interfaces/PipelineScheduleType';
import { TableContainerStyle } from '@components/shared/Table/index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { dateFormatLong } from '@utils/date';
import { getTimeInUTC } from '@components/Triggers/utils';
import { isViewer } from '@utils/session';
import { onSuccess } from '@api/utils/response';

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
  pipelineRun: PipelineRunType,
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
  const isCancelingPipeline = isLoadingCancelPipeline
    && pipelineRunId === cancelingRunId
    && RunStatus.RUNNING === status;

  const [createPipelineRun] = useMutation(
    ScheduleTypeEnum.API === pipelineScheduleType
      && pipelineScheduleToken
      ? api.pipeline_runs.pipeline_schedules.useCreateWithParent(pipelineScheduleId, pipelineScheduleToken)
      : api.pipeline_runs.pipeline_schedules.useCreate(pipelineScheduleId),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            onSuccessProp();
          },
          onErrorCallback: (response, errors) => setErrors({
            errors,
            response,
          }),
        },
      ),
    },
  );

  const retryPipelineRun = useCallback(() => {
    setShowConfirmationId(null);
    // @ts-ignore
    createPipelineRun({
      pipeline_run: {
        execution_date: dateFormatLong(
          new Date().toISOString(),
          {
            includeSeconds: true,
            utcFormat: true,
          },
        ),
        pipeline_schedule_id: pipelineRun?.pipeline_schedule_id,
        pipeline_uuid: pipelineRun?.pipeline_uuid,
        variables: pipelineRun?.variables,
      },
    });
  }, [
    createPipelineRun,
    pipelineRun,
    setShowConfirmationId,
  ]);

  const cancelPipelineRun = useCallback(() => {
    setShowConfirmationId(null);
    setCancelingRunId(pipelineRunId);
    onCancel({
      id: pipelineRunId,
      status: RunStatus.CANCELLED,
    });
  }, [
    onCancel,
    pipelineRunId,
    setCancelingRunId,
    setShowConfirmationId,
  ]);

  return (
    <div
      style={{
        position: 'relative',
      }}
    >
      <Button
        backgroundColor={isCancelingPipeline && dark.accent.yellow}
        beforeIcon={
          (RunStatus.INITIAL !== status && !disabled) && (
            <>
              {RunStatus.COMPLETED === status && <Check size={2 * UNIT} />}
              {[RunStatus.FAILED, RunStatus.CANCELLED].includes(status) && (
                <PlayButtonFilled
                  inverted={RunStatus.CANCELLED === status && !isViewerRole}
                  size={2 * UNIT}
                />
              )}
              {[RunStatus.RUNNING].includes(status) && (
                <Spinner color={isCancelingPipeline ? dark.status.negative : dark.monotone.white} small />
              )}
            </>
          )
        }
        borderRadius={BORDER_RADIUS_XXXLARGE}
        danger={RunStatus.FAILED === status && !isViewerRole}
        default={RunStatus.INITIAL === status}
        disabled={disabled || isViewerRole}
        loading={!pipelineRun}
        onClick={() => setShowConfirmationId(pipelineRunId)}
        padding="6px"
        primary={RunStatus.RUNNING === status && !isCancelingPipeline && !isViewerRole}
        warning={RunStatus.CANCELLED === status && !isViewerRole}
      >
        {disabled
        ? 'Ready'
        : (isCancelingPipeline
          ? 'Canceling'
          : RUN_STATUS_TO_LABEL[status])
        }
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
                This pipeline run is currently ongoing. Retrying will cancel<br />
                the current pipeline run.
              </Text>
              <Text>
              </Text>
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
                  <Button
                    onClick={cancelPipelineRun}
                  >
                    Cancel run
                  </Button>
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
              </Text>
              <Spacing mb={1} />
              <Button
                onClick={retryPipelineRun}
              >
                Retry run
              </Button>
            </>
          )}
        </PopupContainerStyle>
      </ClickOutside>
    </div>
  );
}

type PipelineRunsTableProps = {
  disableRowSelect?: boolean;
  emptyMessage?: string;
  fetchPipelineRuns: () => void;
  onClickRow?: (rowIndex: number) => void;
  pipelineRuns: PipelineRunType[];
  selectedRun?: PipelineRunType;
  setErrors?: (errors: ErrorsType) => void;
};

function PipelineRunsTable({
  disableRowSelect,
  emptyMessage = 'No runs available',
  fetchPipelineRuns,
  onClickRow,
  pipelineRuns,
  selectedRun,
  setErrors,
}: PipelineRunsTableProps) {
  const [cancelingRunId, setCancelingRunId] = useState<number>(null);
  const [showConfirmationId, setShowConfirmationId] = useState<number>(null);
  const [updatePipelineRun, { isLoading: isLoadingCancelPipeline }] = useMutation(
    ({
      id,
      status,
    }: PipelineRunType) =>
      api.pipeline_runs.useUpdate(id)({
        pipeline_run: {
          status,
        },
      }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            setCancelingRunId(null);
            fetchPipelineRuns();
          },
          onErrorCallback: (response, errors) => {
            setCancelingRunId(null);
            setErrors({
              errors,
              response,
            });
          },
        },
      ),
    },
  );

  const columnFlex = [null, 1, 2, 1, 1, null];
  const columns: ColumnType[] = [
    {
      uuid: 'Status',
    },
    {
      uuid: 'Pipeline UUID',
    },
    {
      uuid: 'Date',
    },
    {
      uuid: 'Trigger',
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
  ];

  if (!disableRowSelect && onClickRow) {
    columnFlex.push(null);
    columns.push({
      label: () => '',
      uuid: 'action',
    });
  }

  return (
    <TableContainerStyle
      minHeight={UNIT * 30}
      overflowVisible={!!showConfirmationId}
    >
      {pipelineRuns?.length === 0
        ?
          <Spacing px ={3} py={1}>
            <Text bold default monospace muted>
              {emptyMessage}
            </Text>
          </Spacing>
        :
          <Table
            columnFlex={columnFlex}
            columns={columns}
            isSelectedRow={(rowIndex: number) => disableRowSelect
              ? false
              : pipelineRuns[rowIndex].id === selectedRun?.id
            }
            onClickRow={disableRowSelect ? null : onClickRow}
            rowVerticalPadding={6}
            rows={pipelineRuns?.map((pipelineRun, index) => {
              const {
                block_runs_count: blockRunsCount,
                completed_at: completedAt,
                execution_date: executionDate,
                id,
                pipeline_schedule_id: pipelineScheduleId,
                pipeline_schedule_name: pipelineScheduleName,
                pipeline_uuid: pipelineUUID,
                status,
              } = pipelineRun;
              const disabled = !id && !status;

              const isRetry =
                index > 0
                  && pipelineRuns[index - 1].execution_date === pipelineRun.execution_date
                  && pipelineRuns[index - 1].pipeline_schedule_id === pipelineRun.pipeline_schedule_id;

              let arr = [];
              if (isRetry) {
                arr = [
                  <Spacing key="row_status" ml={1}>
                    <FlexContainer alignItems="center">
                      <Subitem size={2 * UNIT} useStroke/>
                      <Button
                        borderRadius={BORDER_RADIUS_XXXLARGE}
                        notClickable
                        padding="6px"
                      >
                        <Text muted>
                          {RUN_STATUS_TO_LABEL[status]}
                        </Text>
                      </Button>
                    </FlexContainer>
                  </Spacing>,
                  <Text default key="row_pipeline_uuid" monospace muted>
                    {pipelineUUID}
                  </Text>,
                  <Text default key="row_date_retry" monospace muted>
                    -
                  </Text>,
                  <Text default key="row_trigger_retry" monospace muted>
                    -
                  </Text>,
                  <NextLink
                    as={`/pipelines/${pipelineUUID}/runs/${id}`}
                    href={'/pipelines/[pipeline]/runs/[run]'}
                    key="row_block_runs"
                    passHref
                  >
                    <Link bold muted>
                      {`See block runs (${blockRunsCount})`}
                    </Link>
                  </NextLink>,
                  <Text key="row_completed" monospace muted>
                    {(completedAt && getTimeInUTC(completedAt).toISOString().split('.')[0]) || '-'}
                  </Text>,
                  <Button
                    default
                    iconOnly
                    key="row_logs"
                    noBackground
                    onClick={() => Router.push(
                      `/pipelines/${pipelineUUID}/logs?pipeline_run_id[]=${id}`,
                    )}
                  >
                    <TodoList default size={2 * UNIT} />
                  </Button>,
                ];

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
                  <Text default key="row_pipeline_uuid" monospace>
                    {pipelineUUID}
                  </Text>,
                  <Text default key="row_date" monospace>
                    {(executionDate && getTimeInUTC(executionDate).toISOString().split('.')[0]) || '-'}
                  </Text>,
                  <NextLink
                    as={`/pipelines/${pipelineUUID}/triggers/${pipelineScheduleId}`}
                    href={'/pipelines/[pipeline]/triggers/[...slug]'}
                    key="row_trigger"
                    passHref
                  >
                    <Link bold sameColorAsText>
                      {pipelineScheduleName}
                    </Link>
                  </NextLink>,
                  <NextLink
                    as={`/pipelines/${pipelineUUID}/runs/${id}`}
                    href={'/pipelines/[pipeline]/runs/[run]'}
                    key="row_block_runs"
                    passHref
                  >
                    <Link
                      bold
                      disabled={disabled}
                      sameColorAsText
                    >
                      {disabled ? '' : `See block runs (${blockRunsCount})`}
                    </Link>
                  </NextLink>,
                  <Text default key="row_completed" monospace>
                    {(completedAt && getTimeInUTC(completedAt).toISOString().split('.')[0]) || '-'}
                  </Text>,
                  <Button
                    default
                    disabled={disabled}
                    iconOnly
                    key="row_item_13"
                    noBackground
                    onClick={() => Router.push(
                      `/pipelines/${pipelineUUID}/logs?pipeline_run_id[]=${id}`,
                    )}
                  >
                    <TodoList default size={2 * UNIT} />
                  </Button>,
                ];
              }

              if (!disableRowSelect && onClickRow) {
                arr.push(
                  <Flex flex={1} justifyContent="flex-end">
                    <ChevronRight default size={2 * UNIT} />
                  </Flex>,
                );
              }

              return arr;
            })}
            uuid="pipeline-runs"
          />
      }
    </TableContainerStyle>
  );
}

export default PipelineRunsTable;
