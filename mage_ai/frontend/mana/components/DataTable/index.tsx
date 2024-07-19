import Grid from '@mana/components/Grid';
import Link from '@mana/elements/Link';
import NextLink from 'next/link';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import Scrollbar from '@mana/elements/Scrollbar';
import Text from '@mana/elements/Text';
import scrollbars from '@mana/styles/scrollbars';
import styled from 'styled-components';
import { PaddingEnum } from '@mana/themes/padding';
import { RectType } from '@mana/shared/interfaces';
import { SCROLLBAR_TRACK_WIDTH } from '../../themes/scrollbars';
import { TAB_REPORTS } from '@components/datasets/overview/constants';
import { TableHeaderProps, useBlockLayout, useTable } from 'react-table';
import { UNIT } from '@mana/themes/spaces';
import { VariableSizeList } from 'react-window';
import { createDatasetTabRedirectLink } from '@components/utils';
import { gradientBackground } from '../../styles/mixins';
import { isJsonString } from '@utils/string';
import { isObject } from '@utils/hash';
import { randomSample, range, sum, transpose } from '@utils/array';
import { useSticky } from 'react-table-sticky';

const BASE_ROW_HEIGHT = 20;
const DEFAULT_COLUMN_WIDTH = BASE_ROW_HEIGHT;
export const WIDTH_OF_SINGLE_CHARACTER_REGULAR_SM = 10;
const MIN_WIDTH = 80;

type SharedProps = {
  boundingBox: RectType;
  rect: RectType
  rows: Row[];
};

interface Column {
  Header: string;
  accessor: (row: any, i: number) => string | number;
  index?: boolean;
  sticky?: string;
}

type Row = (boolean
  | string
  | number
  | Record<string, string | number | boolean>
  | (string | number)[]
)[];

type TableProps = {
  columns: Column[];
} & SharedProps;

interface ColumnSetting {
  widthMinimum?: number;
  widthPercentage?: number;
  uuid: string;
}

type DataTableProps = {
  columns: string[];
} & SharedProps;

const Styles = styled.div`
  .header {
    ${gradientBackground('0deg', '#0000004D', '#0000004D', 0, 100, 'graylo')}
    backdrop-filter: blur(20px);
    left: 0;
    overflow: hidden;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .table {
    ${scrollbars}
    border-bottom: 1px solid var(--borders-color-base-default);
    border-left: 1px solid var(--borders-color-base-default);
    border-right: 1px solid var(--borders-color-base-default);
    border-spacing: 0;
    border-top: 1px solid var(--borders-color-base-default);
    display: inline-block;

    .tr {
      .td.td-index-column {
        ${gradientBackground('0deg', '#0000004D', '#0000004D', 0, 100, 'graylo')}
        backdrop-filter: blur(20px);
        color: var(--fonts-color-text-muted);
        left: 0;
        position: sticky;
        z-index: 2;
      }

    .th {
      color: var(--fonts-color-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      &.th-monospace {
        font-family: var(--fonts-family-monospace-regular);
      }
    }

    .th,
    .td {
      border-bottom: 1px solid var(--borders-color-base-default);
      border-right: 1px solid var(--borders-color-base-default);
      font-family: var(--fonts-family-base-regular);
      font-size: var(--fonts-size-sm);
      font-style: var(--fonts-style-base);
      font-weight: var(--fonts-weight-regular);
      line-height: var(--fonts-lineheight-sm);
      margin: 0;
      padding: var(--padding-xs);
      white-space: break-spaces;
      word-break: break-word;
    }


    .td {
      color: var(--fonts-color-text-base);

      &.td-monospace {
        font-family: var(--fonts-family-monospace-regular);
      }
    }

    &.sticky {
      overflow: auto;
    }

    .header {
      overflow: hidden;
    }
  }
`;

function estimateCellHeight({
  original,
  values,
}: {
  original: (string | number | (string | number)[])[];
  values: {
    [key: string]: string | number | (string | number)[];
  };
}, {
  columnWidths,
  indexes,
}: {
  columnWidths: number[];
  indexes: number[];
}) {
  const heights = [];

  if (Array.isArray(original)) {
    original.forEach((val, idx) => {
      const wLimit = columnWidths[idx + indexes[idx]];

      const vals = String(val).trim().split('\n');

      let numberOfLines = 0;
      vals.forEach((v) => {
        const wTotal = String(v).length * WIDTH_OF_SINGLE_CHARACTER_REGULAR_SM;
        numberOfLines += Math.ceil(wTotal / wLimit);
      });

      heights.push(numberOfLines * BASE_ROW_HEIGHT);
    });
  }

  return Math.max(...heights, BASE_ROW_HEIGHT) + (PaddingEnum.XS * 2) + 2;
}

function getVariableListHeight(
  rows: {
    original: (string | number | (string | number)[])[];
    values: {
      [key: string]: string | number | (string | number)[];
    };
  }[],
  {
    columnWidths,
    indexes,
  }: {
    columnWidths: number[];
    indexes: number[];
  },
) {
  return sum(rows.map((row) => estimateCellHeight(row, {
    columnWidths,
    indexes,
  })));
}

function buildIndexColumns(
  numberOfIndexes: number,
  opts: {
    disableZeroIndexRowNumber?: boolean;
  } = {},
): Column[] {
  return range(numberOfIndexes).map((i: number, idx: number) => ({
    Header: range(idx + 1)
      .map(() => ' ')
      .join(' '),
    accessor: (_: any, indexNumber: number) =>
      String(indexNumber + (opts?.disableZeroIndexRowNumber ? 1 : 0)),
    index: true,
    sticky: 'left',
  }));
}

function Table({ ...props }: TableProps) {
  const {
    boundingBox,
    columns,
    rect,
    rows,
  } = props;

  const { height: maxHeight, width: maxWidth } = boundingBox;
  const { height, width } = rect;

  const refHeader = useRef(null);
  const refListOuter = useRef(null);

  useEffect(() => {
    const onScrollCallback = e => {
      refHeader?.current?.scroll(e.target.scrollLeft, 0);
    };

    if (refListOuter) {
      refListOuter.current.addEventListener('scroll', onScrollCallback);
    }

    const listOuter = refListOuter.current;

    return () => {
      listOuter?.removeEventListener('scroll', onScrollCallback);
    };
  }, [refHeader, refListOuter]);

  const rowCount = useMemo(() => rows.length, [rows]);
  const indexColumnWidth =
    useMemo(() => (String(rowCount).length * WIDTH_OF_SINGLE_CHARACTER_REGULAR_SM) + (PaddingEnum.XS * 2), [rowCount]);

  const indexes =
    columns.reduce((acc, col, idx) => acc.concat(
      (idx === 0 ? 0 : acc[idx - 1]) + (col.index ? 1 : 0),
    ), []);

  const columnWidthsRaw = useMemo(() => {
    const widths = columns.map(() => 0);

    rows.forEach((values, idxRow) => {
      columns.forEach(({ index }, idx) => {
        const val = index
          ? String(idxRow).length
          : String(values[idx - indexes[idx]] ?? '').length;
        widths[idx] = Math.max(widths[idx], val) + (PaddingEnum.XS * 2);
      });
    });

    return widths;
  }, [columns, indexes, rows]);

  const columnWidths = useMemo(() => {
    const MIN_WIDTH = 80;
    let widthOffset = 0;

    const initialWidths = columns.map((col, idx) => {
      if (col.index) {
        widthOffset += indexColumnWidth;
        return indexColumnWidth;
      }

      const width = columnWidthsRaw[idx] * WIDTH_OF_SINGLE_CHARACTER_REGULAR_SM;
      return width < MIN_WIDTH ? MIN_WIDTH : width;
    });

    const totalInitialWidths = initialWidths.reduce((acc, width) => acc + width, 0);
    const remainingWidth = width - widthOffset;
    const scaleFactor = remainingWidth / totalInitialWidths;

    return columns.map((col, idx) => {
      if (col.index) {
        return indexColumnWidth;
      }

      const newWidth = initialWidths[idx] * scaleFactor;
      return newWidth < MIN_WIDTH ? MIN_WIDTH : newWidth;
    });
  }, [columns, columnWidthsRaw, indexColumnWidth, width]);

  const defaultColumn = useMemo(() => {
    const widthAdjusted = width
      - (indexColumnWidth + UNIT * 1.5 + SCROLLBAR_TRACK_WIDTH);

    const numberOfColumns = columnWidths.length - 1;
    let defaultColumnWidth = DEFAULT_COLUMN_WIDTH;

    if (defaultColumnWidth * numberOfColumns < widthAdjusted) {
      defaultColumnWidth = widthAdjusted / numberOfColumns;
    }

    return {
      width: defaultColumnWidth,
    };
  }, [columnWidths, indexColumnWidth, width]);

  console.log('rowsProcessed', columns);

  const {
    getTableBodyProps, getTableProps, headerGroups, prepareRow, rows: rowsProcessed,
  } = useTable(
    {
      columns,
      data: rows,
      defaultColumn,
    },
    useBlockLayout,
    useSticky,
  );

  const renderRow = useCallback(
    ({ index, style }) => {
      const row = rowsProcessed[index];
      prepareRow(row);
      const { original } = row;

      return (
        <div
          {...row.getRowProps({
            style: {
              ...style,
              width: 'auto',
            },
          })}
          className="tr"
        >
          {row.cells.map((cell, idx: number) => {
            const settings = columns[idx];
            const cellProps = cell.getCellProps();
            const cellStyle: {
              [key: string]: number | string;
            } = {
              ...cellProps.style,
            };

            let cellValue = cell.render('Cell');
            let cellValueDisplay = cellValue;
            cellStyle.width = columnWidths[idx];

            if (settings?.index) {
              cellStyle.left = 0;
              cellStyle.position = 'sticky';
              cellStyle.textAlign = 'center';
            } else {
              cellValue = original[idx - indexes[idx]];

              console.log(cellValue);

              if (Array.isArray(cellValue) || typeof cellValue === 'object') {
                try {
                  cellValue = JSON.stringify(cellValue);
                } catch {
                  cellValue = 'Error: cannot display value';
                }
              }
            }

            if (cellValue === true) {
              cellValueDisplay = 'True';
            } else if (cellValue === false) {
              cellValueDisplay = 'False';
            } else if (cellValue === null || cellValue === 'null') {
              cellValueDisplay = 'None';
            } else {
              cellValueDisplay = cellValue;
            }

            return (
              <div
                {...cellProps}
                className={[
                  `td ${settings?.index ? 'td-index-column' : ''}`,
                  'td-monospace',
                ].filter(Boolean).join(' ')}
                key={`${idx}-${cellValue}`}
                style={cellStyle}
              >
                {typeof cellValueDisplay === 'object' ? (
                  cellValueDisplay
                ) : cellValueDisplay}
              </div>
            );
          })}
        </div>
      );
    },
    [columnWidths, columns, indexes, prepareRow, rowsProcessed],
  );

  const variableListMemo = useMemo(
    () => (
      <VariableSizeList
        estimatedItemSize={BASE_ROW_HEIGHT}
        height={getVariableListHeight(rowsProcessed, {
          columnWidths,
          indexes,
        })}
        itemCount={rowCount}
        itemSize={(idx: number) => {
          const size = estimateCellHeight(rowsProcessed[idx], {
            columnWidths,
            indexes,
          });

          return size;
        }}
        outerRef={refListOuter}
        style={{
          overflow: 'hidden',
          width: rect?.width,
        }}
      >
        {renderRow}
      </VariableSizeList>
    ),
    [renderRow, rowCount, rowsProcessed, indexes, columnWidths, rect],
  );

  const headerMemo = useMemo(() => headerGroups.map((headerGroup, groupIdx) => {
    const arr = headerGroup.headers.map((column, idx: number) => {
      const settings = columns[idx];
      const columnProps = column.getHeaderProps();
      const columnStyle: {
        [key: string]: number | string;
      } = {
        ...columnProps.style,
      };

      const colWidth = columnWidths[idx];
      columnStyle.minWidth = colWidth;
      columnStyle.width = colWidth;

      if (settings.index) {
        columnStyle.fontFamily = 'var(--fonts-family-monospace-regular)';
        columnStyle.left = 0;
        columnStyle.position = 'sticky';
        columnStyle.textAlign = 'center';
      }

      const el = column.render('Header');

      return (
        <div
          {...columnProps}
          className="th th-monospace"
          key={column.id}
          style={columnStyle}
          title={settings.index ? 'Row number' : undefined}
        >
          {el}
        </div>
      );
    });

    return (
      <div
        {...headerGroup.getHeaderGroupProps()}
        className="tr"
        key={`${headerGroup.id}_${groupIdx}`}
      >
        {arr}
      </div>
    );
  }), [columns, columnWidths, headerGroups]);

  return (
    <div
      {...getTableProps()}
      className="table sticky"
      style={{
        maxHeight: boundingBox.height,  // Adjust the height as needed
        maxWidth: boundingBox.width,  // Adjust the width as needed
        overflowX: 'scroll',  // Enable vertical scrolling
        overflowY: 'scroll',  // Enable vertical scrolling
      }}
    >

      <div
        {...getTableBodyProps()}
        className="body"
      >
        <div className="header" ref={refHeader} style={{ width: rect.width }}>
          {headerMemo}
        </div>
        {variableListMemo}
      </div>
    </div>
  );
}

function DataTable({
  boundingBox,
  columns: columnsProp,
  rows,
  ...rest
}: DataTableProps) {
  const columns = useMemo(() => buildIndexColumns(1).concat(
    columnsProp?.map(col => ({
      Header: String(col),
      accessor: () => String(col),
    })) as {
      Header: string;
      accessor: (row: any, i: number) => string;
      sticky?: string;
    }[]), [columnsProp],
  );

  return (
    <Styles
      style={{
        height: boundingBox.height,
        // overflow: 'hidden',
        width: boundingBox.width,
      }}
    >
      <Table
        {...rest}
        boundingBox={boundingBox}
        columns={columns}
        rows={rows}
      />
    </Styles>
  );
}

export default DataTable;
