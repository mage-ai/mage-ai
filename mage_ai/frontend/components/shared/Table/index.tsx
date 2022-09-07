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

export type ColumnType = {
  label?: () => string;
  uuid: string;
};

type TableProps = {
  alignTop?: boolean;
  buildLinkProps?: (rowIndex: number) => {
    as: string;
    href: string;
  };
  columnFlex: number[];
  columnMaxWidth?: (colIndex: number) => string;
  columns?: ColumnType[];
  compact?: boolean;
  isSelectedRow?: (rowIndex: number) => boolean;
  noBorder?: boolean;
  onClickRow?: (index: number) => void;
  rows: any[][];
  uuid?: string;
}

function Table({
  alignTop,
  buildLinkProps,
  columnFlex,
  columnMaxWidth,
  columns = [],
  compact,
  isSelectedRow,
  noBorder,
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
        alignTop={alignTop}
        compact={compact}
        key={`${uuid}-row-${rowIndex}-cell-${colIndex}`}
        maxWidth={columnMaxWidth?.(colIndex)}
        noBorder={noBorder}
        selected={isSelectedRow?.(rowIndex)}
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
        onClick={onClickRow ? () => onClickRow(rowIndex) : null}
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
    alignTop,
    buildLinkProps,
    calculateCellWidth,
    columnMaxWidth,
    columns,
    compact,
    isSelectedRow,
    noBorder,
    onClickRow,
    rows,
  ]);

  return (
    <TableStyle>
      {columns?.length >= 1 && (
        <TableRowStyle noHover>
          {columns.map((col, idx) => (
            <TableHeadStyle
              compact={compact}
              key={`${uuid}-col-${col.uuid}-${idx}`}
              noBorder={noBorder}
            >
              <Text bold leftAligned monospace muted>
                {col.label ? col.label() : col.uuid}
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
