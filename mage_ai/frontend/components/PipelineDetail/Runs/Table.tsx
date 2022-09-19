import NextLink from 'next/link';
import Router from 'next/router';
import { useMemo, useRef, useState } from 'react';
import { useMutation } from 'react-query';

import Button from '@oracle/elements/Button';
import ClickOutside from '@oracle/components/ClickOutside';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu from '@oracle/components/FlyoutMenu';
import Link from '@oracle/elements/Link';
import PipelineRunType, { RunStatus, RUN_STATUS_TO_LABEL } from '@interfaces/PipelineRunType';
import Spacing from '@oracle/elements/Spacing';
import Spinner from '@oracle/components/Spinner';
import Table, { ColumnType } from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { Check, ChevronRight, PlayButtonFilled, Subitem, TodoList } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { getTimeInUTC } from '@components/Triggers/utils';
import { onSuccess } from '@api/utils/response';

function RetryButton({
  onSuccess: onSuccessProp,
  pipelineRun,
}: {
  onSuccess: () => void;
  pipelineRun: PipelineRunType,
}) {
  const { status } = pipelineRun;

  const [createPipelineRun] = useMutation(
    api.pipeline_runs.pipeline_schedules.useCreate(pipelineRun?.pipeline_schedule_id),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            onSuccessProp();
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
  const [showConfirmation, setShowConfirmation] = useState<boolean>();
  const refConfirmation = useRef(null);

  return (
    <div
      ref={refConfirmation}
      style={{
        position: 'relative',
      }}
    >
      <Button
        beforeIcon={
          RunStatus.INITIAL !== status && (
            <>
              {RunStatus.COMPLETED === status && <Check size={2 * UNIT} />}
              {[RunStatus.FAILED, RunStatus.CANCELLED].includes(status) && (
                <PlayButtonFilled size={2 * UNIT} />
              )}
              {[RunStatus.RUNNING].includes(status) && (
                <Spinner color="white" small />
              )}
            </>
          )
        }
        borderRadius={BORDER_RADIUS_XXXLARGE}
        danger={RunStatus.FAILED === status}
        default={RunStatus.CANCELLED === status}
        notClickable={RunStatus.COMPLETED === status}
        onClick={() => setShowConfirmation(RunStatus.COMPLETED !== status)}
        padding="6px"
        primary={RunStatus.RUNNING === status}
        warning={RunStatus.INITIAL === status}
      >
        {RUN_STATUS_TO_LABEL[status]}
      </Button>
      <ClickOutside
        onClickOutside={() => setShowConfirmation(false)}
        open={showConfirmation}
      >
        <FlyoutMenu
          items={
            [
              {
                label: () => 'Retry pipeline run',
                // @ts-ignore
                onClick: () => createPipelineRun({
                  pipeline_run: {
                    execution_date: pipelineRun?.execution_date,
                    pipeline_schedule_id: pipelineRun?.pipeline_schedule_id,
                    pipeline_uuid: pipelineRun?.pipeline_uuid,
                    variables: pipelineRun?.variables,
                  },
                }),
                uuid: 'retry_run',
              },
              // {
              //   label: () => 'Cancel',
              //   onClick: () => setShowConfirmation(false),
              //   uuid: 'cancel',
              // },
            ]
          }
          onClickCallback={() => setShowConfirmation(false)}
          open={showConfirmation}
          parentRef={refConfirmation}
          uuid="PipelineRunTable/retry"
          width={UNIT * 25}
        />
      </ClickOutside>
    </div>
  );
}

type PipelineRunsTableProps = {
  fetchPipelineRuns: () => void,
  onClickRow?: (rowIndex: number) => void;
  pipelineRuns: PipelineRunType[];
  selectedRun?: PipelineRunType;
};

function PipelineRunsTable({
  fetchPipelineRuns,
  onClickRow,
  pipelineRuns,
  selectedRun,
}: PipelineRunsTableProps) {
  const columnFlex = [null, 1, 2, 1, 1, null];
  const columns: ColumnType[] = [
    {
      uuid: 'Status',
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

  if (onClickRow) {
    columnFlex.push(null);
    columns.push({
      label: () => '',
      uuid: 'action',
    });
  }

  const sortedPipelineRuns = useMemo(() => {
    const sortedRuns = [ ...pipelineRuns ];
    sortedRuns.sort((a, b) => Date.parse(b.execution_date) - Date.parse(a.execution_date));

    return sortedRuns;
  }, [
    pipelineRuns,
  ]);

  return (
    <Table
      columnFlex={columnFlex}
      columns={columns}
      isSelectedRow={(rowIndex: number) => pipelineRuns[rowIndex].id === selectedRun?.id}
      onClickRow={onClickRow}
      rows={sortedPipelineRuns.map((pipelineRun, index) => {
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

        const isRetry =
          index > 0 && sortedPipelineRuns[index - 1].execution_date == pipelineRun.execution_date;

        let arr = [];
        if (isRetry) {
          arr = [
            <Spacing ml={1}>
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
            <Text default monospace muted>
              -
            </Text>,
            <Text default monospace muted>
              -
            </Text>,
            <NextLink
              as={`/pipelines/${pipelineUUID}/runs/${id}`}
              href={'/pipelines/[pipeline]/runs/[run]'}
              passHref
            >
              <Link bold muted>
                {`See block runs (${blockRunsCount})`}
              </Link>
            </NextLink>,
            <Text monospace muted>
              {(completedAt && getTimeInUTC(completedAt).toISOString().split('.')[0]) || '-'}
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
          ];

        } else {
          arr = [
            <RetryButton
              onSuccess={fetchPipelineRuns}
              pipelineRun={pipelineRun}
            />,
            <Text monospace default>
              {executionDate}
            </Text>,
            <NextLink
              as={`/pipelines/${pipelineUUID}/triggers/${pipelineScheduleId}`}
              href={'/pipelines/[pipeline]/triggers/[...slug]'}
              passHref
            >
              <Link bold sameColorAsText>
                {pipelineScheduleName}
              </Link>
            </NextLink>,
            <NextLink
              as={`/pipelines/${pipelineUUID}/runs/${id}`}
              href={'/pipelines/[pipeline]/runs/[run]'}
              passHref
            >
              <Link bold sameColorAsText>
                {`See block runs (${blockRunsCount})`}
              </Link>
            </NextLink>,
            <Text default monospace>
              {(completedAt && getTimeInUTC(completedAt).toISOString().split('.')[0]) || '-'}
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
          ];
        }

        if (onClickRow) {
          arr.push(
            <Flex flex={1} justifyContent="flex-end">
              <ChevronRight default size={2 * UNIT} />
            </Flex>
          );
        }

        return arr;
      })}
      uuid="pipeline-runs"
    />
  );
}

export default PipelineRunsTable;
