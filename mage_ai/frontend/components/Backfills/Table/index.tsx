import NextLink from 'next/link';

import BackfillType, {
  BACKFILL_TYPE_DATETIME,
  BACKFILL_TYPE_CODE,
} from '@interfaces/BackfillType';
import Button from '@oracle/elements/Button';
import Link from '@oracle/elements/Link';
import Table, { ColumnType } from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { Edit } from '@oracle/icons';
import { RunStatus } from '@interfaces/PipelineRunType';
import { UNIT } from '@oracle/styles/units/spacing';
import { getTimeInUTCString } from '@components/Triggers/utils';

type BackfillsTableProps = {
  pipeline: {
    uuid: string;
  };
  models: BackfillType[];
  onClickRow: (backfill: BackfillType) => void;
  selectedRow?: BackfillType;
};

function BackfillsTable({
  models,
  onClickRow,
  pipeline,
  selectedRow,
}: BackfillsTableProps) {
  const pipelineUUID = pipeline?.uuid;
  const columnFlex = [null, 1, null, null, null, 1, 1, null];
  const columns: ColumnType[] = [
    {
      uuid: 'Status',
    },
    {
      uuid: 'Name',
    },
    {
      uuid: 'Type',
    },
    {
      uuid: 'Runs',
    },
    {
      uuid: 'Backfill',
    },
    {
      uuid: 'Started at',
    },
    {
      uuid: 'Completed at',
    },
    {
      label: () => '',
      uuid: 'edit',
    },
  ];

  return (
    <Table
      columnFlex={columnFlex}
      columns={columns}
      isSelectedRow={(rowIndex: number) => models[rowIndex].id === selectedRow?.id}
      onClickRow={(rowIndex: number) => onClickRow(models[rowIndex])}
      rows={models.map(({
        block_uuid: blockUUID,
        completed_at: completedAt,
        end_datetime: endDatetime,
        id,
        name,
        start_datetime: startDatetime,
        started_at: startedAt,
        status,
        total_run_count: totalRunCount,
      }, idx) => {
        const arr = [
          <Text default key="status" monospace>{status || 'inactive'}</Text>,
          <NextLink
            as={`/pipelines/${pipelineUUID}/backfills/${id}`}
            href={'/pipelines/[pipeline]/backfills/[...slug]'}
            key="name"
            passHref
          >
            <Link bold sameColorAsText>
              {name}
            </Link>
          </NextLink>,
          <Text default key="type" monospace>
            {blockUUID ? BACKFILL_TYPE_CODE : BACKFILL_TYPE_DATETIME}
          </Text>,
          <Text default key="runs" monospace>{totalRunCount || 0}</Text>,
          <Text default key="backfill" monospace>
            {startDatetime && endDatetime && (
              <>
                {getTimeInUTCString(startDatetime)}
                &nbsp;-&nbsp;
                {getTimeInUTCString(endDatetime)}
              </>
            )}
            {!(startDatetime && endDatetime) && '-'}
          </Text>,
          <Text default key="started_at" monospace>
            {startedAt ? getTimeInUTCString(startedAt) : '-'}
          </Text>,
          <Text default key="completed_at" monospace>
            {completedAt ? getTimeInUTCString(completedAt) : '-'}
          </Text>,
          <Button
            default
            disabled={status === RunStatus.COMPLETED}
            iconOnly
            key={`${idx}_edit_button`}
            linkProps={{
              as: `/pipelines/${pipelineUUID}/backfills/${id}/edit`,
              href: '/pipelines/[pipeline]/backfills/[...slug]',
            }}
            noBackground
            title="Edit"
          >
            <Edit default size={2 * UNIT} />
          </Button>
        ];

        return arr;
      })}
      uuid="pipeline-runs"
    />
  );
}

export default BackfillsTable;
