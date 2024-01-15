export type TableDataType = {
  columns?: string[];
  index: number;
  rows: (string | number | boolean)[][];
  shape: number[];
};

export function prepareTableData(data: TableDataType): TableDataType {
  return data;
}
