import BackfillType from '@interfaces/BackfillType';
import Table, { ColumnType } from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { getTimeInUTC } from '@components/Triggers/utils';

type BackfillsTableProps = {
  models: BackfillType[];
  onClickRow: (backfill: BackfillType) => void;
  selectedRow?: BackfillType;
};

function BackfillsTable({
  models,
  onClickRow,
  selectedRow,
}: BackfillsTableProps) {
  const columnFlex = [null, 1, 1, 1];
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
  ];



  return (
    <Table
      columnFlex={columnFlex}
      columns={columns}
      isSelectedRow={(rowIndex: number) => models[rowIndex].id === selectedRow?.id}
      onClickRow={(rowIndex: number) => onClickRow(models[rowIndex])}
      rows={models.map(({
        completed_at: completedAt,
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
        ];

        return arr;
      })}
      uuid="pipeline-runs"
    />
  );
}

export default BackfillsTable;
