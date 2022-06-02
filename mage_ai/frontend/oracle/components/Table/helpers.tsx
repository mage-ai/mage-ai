import { UNIT } from '@oracle/styles/units/spacing';
import { DataTableRow } from './types';

// TODO: Update with official numbers and import from units/spacing.ts
export const WIDTH_OF_SINGLE_CHARACTER = 2;

export const getColumnWidth = (
  rows: DataTableRow<any>[],
  headerText: string,
) => {
  const toFieldLength = (row: any) => (row?.toString() ?? '').length;

  // Use the largest length between the rows and columns.
  const cellLength = Math.max(
    // TODO: could short circuit here if a single item length > MAX_COL_WIDTH
    ...rows.map(toFieldLength),
    headerText.length,
  );
  console.log("Rows", Math.max(...rows.map(toFieldLength)), "Header:", headerText, headerText.length, "cellLength:", cellLength)
  return cellLength * WIDTH_OF_SINGLE_CHARACTER;
};
