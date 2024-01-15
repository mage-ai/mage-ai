import DataTable from '@components/DataTable';
import KernelOutputType from '@interfaces/KernelOutputType';
import Text from '@oracle/elements/Text';
import { TableDataType } from './utils';
import { OutputGroupType } from './useOutputGroups';

export default function useDataTable({
  data,
  disableScrolling,
  maxHeight,
  noBorderBottom,
  noBorderLeft,
  noBorderRight,
  noBorderTop,
  output,
  width,
}: {
  data: TableDataType;
  disableScrolling?: boolean;
  maxHeight?: number;
  noBorderBottom?: boolean;
  noBorderLeft?: boolean;
  noBorderRight?: boolean;
  noBorderTop?: boolean;
  output: KernelOutputType;
  width?: number;
}) {
  const {
    columns,
    index,
    rows,
    shape,
  } = data || {
    columns: [],
    index: 0,
    rows: [],
    shape: [],
  };

  if (columns?.some(header => header === '')) {
    return (
      <Text monospace small warning>
        Output data could not be rendered due to empty string headers.
        Please check your data’s column headers for empty strings.
      </Text>
    );
  }

  return (
    <DataTable
      columns={columns}
      disableScrolling={disableScrolling}
      index={index}
      maxHeight={maxHeight}
      noBorderBottom={noBorderBottom}
      noBorderLeft={noBorderLeft}
      noBorderRight={noBorderRight}
      noBorderTop={noBorderTop}
      rows={rows}
      width={width}
    />
  );
}
