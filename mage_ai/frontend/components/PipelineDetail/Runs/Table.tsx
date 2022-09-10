import NextLink from 'next/link';
import Router from 'next/router';

import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import Link from '@oracle/elements/Link';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import PipelineType from '@interfaces/PipelineType';
import Table, { ColumnType } from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import api from '@api';
import { BLUE_SKY } from '@oracle/styles/colors/main';
import { ChevronRight, TodoList } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { useMutation } from 'react-query';
import { onSuccess } from '@api/utils/response';
import { getTimeInUTC } from '@components/Triggers/utils';

type PipelineRunsTableProps = {
  fetchPipelineRuns: () => void,
  onClickRow?: (rowIndex: number) => void;
  pipeline: PipelineType;
  pipelineRuns: PipelineRunType[];
  selectedRun?: PipelineRunType;
  showTrigger?: boolean;
};

function PipelineRunsTable({
  fetchPipelineRuns,
  onClickRow,
  pipeline,
  pipelineRuns,
  selectedRun,
  showTrigger,
}: PipelineRunsTableProps) {
  const {
    uuid: pipelineUUID,
  } = pipeline || {};

  const [updatePipelineRun, { isLoading: isLoadingUpdatePipelineRun }] = useMutation(
    (pipelineRun: PipelineRunType) =>
      api.pipeline_runs.useUpdate(pipelineRun.id)({
        pipeline_run: pipelineRun,
      }),
    {
      onSuccess: (response: any) => onSuccess(
        response, {
          callback: () => {
            fetchPipelineRuns();
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

  const columnFlex = [null, 1, 1, 1, 1, null];
  const columns: ColumnType[] = [
    {
      uuid: 'Date',
    },
    {
      uuid: 'Status',
    },
    {
      uuid: 'Block runs',
    },
    {
      uuid: 'Completed',
    },
    {
      uuid: 'Action',
    },
    {
      uuid: 'Logs',
    },
  ];

  if (showTrigger) {
    columnFlex.splice(2, 0, 3);
    columns.splice(2, 0, { uuid: 'Trigger' });
  }

  if (onClickRow) {
    columnFlex.push(null);
    columns.push({
      label: () => '',
      uuid: 'action',
    });
  }

  return (
    <Table
      columnFlex={columnFlex}
      columns={columns}
      isSelectedRow={(rowIndex: number) => pipelineRuns[rowIndex].id === selectedRun?.id}
      onClickRow={onClickRow}
      rows={pipelineRuns.map(({
        block_runs_count: blockRunsCount,
        completed_at: completedAt,
        execution_date: executionDate,
        id,
        pipeline_schedule_id: pipelineScheduleId,
        pipeline_schedule_name: pipelineScheduleName,
        pipeline_uuid: pipelineUUID,
        status,
      }: PipelineRunType) => {
        const arr = [
          <Text monospace default>
            {executionDate}
          </Text>,
          <Text
            danger={RunStatus.FAILED === status}
            default={RunStatus.CANCELLED === status}
            info={RunStatus.INITIAL === status}
            monospace
            success={RunStatus.COMPLETED === status}
            warning={RunStatus.RUNNING === status}
          >
            {status}
          </Text>,
<<<<<<< HEAD
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
=======
          <Text default monospace>
            {blockRunsCount}
          </Text>,
>>>>>>> c289d709 ([dy] Add pipeline run rerun)
          <Text default monospace>
            {(completedAt && getTimeInUTC(completedAt).toISOString().split('.')[0]) || '-'}
          </Text>,
          <>
            {status !== RunStatus.COMPLETED && (
              <Link
                color={BLUE_SKY}
                monospace
                onClick={() => updatePipelineRun({
                  id,
                  status: RunStatus.RUNNING,
                })}
                underline
              >
                rerun
              </Link>
            )}
          </>,
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

        if (showTrigger) {
          arr.splice(
            2,
            0, 
            <NextLink
              as={`/pipelines/${pipelineUUID}/triggers/${pipelineScheduleId}`}
              href={'/pipelines/[pipeline]/triggers/[...slug]'}
              passHref
            >
              <Link bold sameColorAsText>
                {pipelineScheduleName}
              </Link>
            </NextLink>,
          );
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
