import Table from '@components/shared/Table';
import Text from '@oracle/elements/Text';
import { capitalizeRemoveUnderscoreLower } from '@utils/string';

export function buildTable(rows) {
  if (!rows?.length) {
    return null;
  }

  const rowSample = rows?.[0];
  const columns =
    Object.keys(rowSample || {})?.map(uuid => ({ uuid: capitalizeRemoveUnderscoreLower(uuid) }));

  return (
    <Table
      columnFlex={columns?.map((col, idx: number) => idx === 0 ? null : 1)}
      columns={columns}
      rows={rows?.map((row) => Object.entries(row || {}).map(([k, v]) => [
        <Text
          default
          key={k}
          monospace
        >
          {v}
        </Text>,
      ]))}
    />
  );
}
