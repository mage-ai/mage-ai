import NextLink from 'next/link';
import { useCallback, useMemo } from 'react';

import Link from '@oracle/elements/Link';
import Text from '@oracle/elements/Text';
import {
  TableDataStyle,
  TableHeadStyle,
  TableRowStyle,
  TableStyle,
} from './index.style';

type ColumnType = {
  label?: () => string;
  uuid: string;
};

type TableProps = {
  buildLinkProps?: (rowIndex: number) => {
    as: string;
    href: string;
  };
  columnFlex: number[];
  columnMaxWidth?: (col: string) => string;
  columns: ColumnType[];
  onClickRow?: (index: number) => void;
  rows: any[][];
  uuid?: string;
}

function Table({
  buildLinkProps,
  columnFlex,
  columnMaxWidth,
  columns,
  onClickRow,
  rows,
  uuid,
}: TableProps) {
  const totalFlex = useMemo(() => columnFlex.reduce((acc, val) => acc + (val || 0), 0), columnFlex);
  const calculateCellWidth = useCallback((idx: number) => {
    if (columnFlex[idx]) {
      const width = Math.round(100 * (columnFlex[idx] / totalFlex));
      return `${width}%`;
    }

    return null;
  }, []);

  const rowEls = useMemo(() => rows?.map((cells, rowIndex) => {
    const linkProps = buildLinkProps?.(rowIndex);
    const cellEls = cells.map((cell, colIndex) => (
      <TableDataStyle
        key={`${uuid}-row-${rowIndex}-cell-${colIndex}`}
        maxWidth={columnMaxWidth?.(columns[colIndex].uuid)}
        width={calculateCellWidth(colIndex)}
      >
        {cell}
      </TableDataStyle>
    ));
    const rowEl = (
      <TableRowStyle
        key={`${uuid}-row-${rowIndex}`}
        noHover={!(linkProps || onClickRow)}
        // @ts-ignore
        onClick={onClickRow ? onClickRow(rowIndex) : null}
      >
        {cellEls}
      </TableRowStyle>
    );

    if (linkProps) {
      return (
        <NextLink
          {...linkProps}
          passHref
        >
          <Link
            fullWidth
            noHoverUnderline
            noOutline
            // @ts-ignore
            style={{
              display: 'table-row-group',
            }}
            verticalAlignContent
          >
            {rowEl}
          </Link>
        </NextLink>
      );
    }

    return rowEl;
  }), [
    buildLinkProps,
    calculateCellWidth,
    columnMaxWidth,
    columns,
    onClickRow,
  ]);

  return (
    <TableStyle>
      {columns && (
        <TableRowStyle>
          {columns.map((col, idx) =>
          (
            <TableHeadStyle key={`${uuid}-col-${col.uuid}-${idx}`}>
              <Text bold leftAligned monospace muted>
                {col.label?.() || col.uuid}
              </Text>
            </TableHeadStyle>
          ))}
        </TableRowStyle>
      )}

      {rowEls}
    </TableStyle>
  );
}

export default Table;
