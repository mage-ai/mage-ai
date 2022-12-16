import type {
  Column, ColumnInstance, Row, UseTableCellProps,
} from 'react-table';

export type DataTableRow<D extends Record<string, unknown>> = Row<D>;

export type DataTableColumn = Column;

/**
 * 0 based row index, use -1 for header row
 */
type RowIndex = number;

/**
 * 0 based cell index, use -1 to access a row count column (if applicable)
 */
type CellIndex = number;

type CellPath = [RowIndex, CellIndex];
type ColumnPath = [null, CellIndex];
type RowPath = [RowIndex, null];
export type AnyTablePath = RowPath | CellPath | ColumnPath;

export type DataTableSelected = AnyTablePath[];

export type DataTableClickContext = {

  /**
   * If the cell clicked is not a header cell, the cell prop will exist on the context.
   */
  cell?: UseTableCellProps<any, any>

  /**
   * If the clicked cell is a header cell, the column prop will exist on the context.
   */
  column?: ColumnInstance

  /**
   * The 0-index based cell path (row, col) which was clicked.
   * @example [0, 0] is the first cell in the first row of data
   * @example [0, -1] is the header cell for the first row of
   */
  path: CellPath

  /**
   * The synthetic react event from the mouse click
   */
  event: React.MouseEvent
};

export type StatsByColumnType = {
  [key: string]: {
    [key: string]: number;
  }
};
