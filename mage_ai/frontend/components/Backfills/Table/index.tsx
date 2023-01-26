import BackfillType from '@interfaces/BackfillType';
import Button from '@oracle/elements/Button';
import Table, { ColumnType } from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { Edit } from '@oracle/icons';
import { UNIT } from '@oracle/styles/units/spacing';
import { getTimeInUTC } from '@components/Triggers/utils';

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
  const columnFlex = [null, 1, 1, 1, null];
  const columns: ColumnType[] = [
    {
      uuid: 'Status',
    },
    {
      uuid: 'Name',
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
        completed_at: completedAt,
        id,
        name,
        started_at: startedAt,
        status,
      }) => {
        const arr = [
          <Text default key="status" monospace>{status}</Text>,
          <Text bold key="name">{name}</Text>,
          <Text default key="started_at" monospace>
            {startedAt ? getTimeInUTC(startedAt).toISOString().split('.')[0] : '-'}
          </Text>,
          <Text default key="completed_at" monospace>
            {completedAt ? getTimeInUTC(completedAt).toISOString().split('.')[0] : '-'}
          </Text>,
          <Button
            default
            iconOnly
            noBackground
            linkProps={{
              as: `/pipelines/${pipelineUUID}/backfills/${id}/edit`,
              href: '/pipelines/[pipeline]/backfills/[...slug]',
            }}
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
