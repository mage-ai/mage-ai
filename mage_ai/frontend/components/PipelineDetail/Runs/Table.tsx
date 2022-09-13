import NextLink from 'next/link';
import Router from 'next/router';

import Button from '@oracle/elements/Button';
import Flex from '@oracle/components/Flex';
import Link from '@oracle/elements/Link';
import PipelineRunType, { RunStatus } from '@interfaces/PipelineRunType';
import PipelineType from '@interfaces/PipelineType';
import Table, { ColumnType } from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { ChevronRight, TodoList } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';

type PipelineRunsTableProps = {
  onClickRow?: (rowIndex: number) => void;
  pipeline: PipelineType;
  pipelineRuns: PipelineRunType[];
  selectedRun?: PipelineRunType;
};

function PipelineRunsTable({
  onClickRow,
  pipeline,
  pipelineRuns,
  selectedRun,
}: PipelineRunsTableProps) {
  const {
    uuid: pipelineUUID,
  } = pipeline || {};

  const columnFlex = [null, 1, 2, 2, 1, null];
  const columns: ColumnType[] = [
    {
      uuid: 'Date',
    },
    {
      uuid: 'Status',
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

  return (
    <Table
      columnFlex={columnFlex}
      columns={columns}
      isSelectedRow={(rowIndex: number) => pipelineRuns[rowIndex].id === selectedRun?.id}
      onClickRow={onClickRow}
      rows={pipelineRuns.map(({
        block_runs_count: blockRunsCount,
        completed_at: completedAt,
        created_at: createdAt,
        id,
        pipeline_schedule_id: pipelineScheduleId,
        pipeline_schedule_name: pipelineScheduleName,
        pipeline_uuid: pipelineUUID,
        status,
      }: PipelineRunType) => {
        const arr = [
          <Text monospace default>
            {createdAt}
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
            {completedAt || '-'}
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
