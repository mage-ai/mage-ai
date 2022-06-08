import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import scrollbarWidth from './scrollbarWidth';
import styled from 'styled-components';
import { VariableSizeList } from 'react-window';
import {
  useBlockLayout,
  useTable,
} from 'react-table';
import { useSticky } from 'react-table-sticky';

import light from '@oracle/styles/themes/light';
import {
  FONT_FAMILY_REGULAR,
  MONO_FONT_FAMILY_REGULAR,
} from '@oracle/styles/fonts/primary';
import {
  REGULAR,
  REGULAR_LINE_HEIGHT,
} from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';

const BASE_ROW_HEIGHT = (UNIT * 2) + REGULAR_LINE_HEIGHT;
const DEFAULT_COLUMN_WIDTH = UNIT * 20;
const WIDTH_OF_CHARACTER = 8.5;

type TableProps = {
  columns: {
    Header: string;
    accessor: (row: any, i: number) => string | number;
    sticky?: string;
  }[];
  data: string[][] | number[][];
  height?: number;
  width?: number;
};

type DataTableProps = {
  columns: string[];
  height?: number;
  rows: string[][] | number[][];
  width?: number;
}

const Styles = styled.div<{
  height?: number;
}>`
  ${props => props.height && `
    height: ${props.height}px;
  `}

  .table {
    border-spacing: 0;
    display: inline-block;

    ${props => `
      border: 1px solid ${(props.theme.monotone || light.monotone).grey200};
    `}

    .tr {
      :last-child {
        .td {
          border-bottom: 0;
        }
      }
    }

    .th,
    .td {
      ${REGULAR}
      font-family: ${FONT_FAMILY_REGULAR};
      margin: 0;
      padding: ${UNIT * 1}px;

      ${props => `
        background-color: ${(props.theme.monotone || light.monotone).grey100};
        border-bottom: 1px solid ${(props.theme.monotone || light.monotone).grey200};
        border-right: 1px solid ${(props.theme.monotone || light.monotone).grey200};
      `}

      :last-child {
        ${props => `
          border-right: 1px solid ${(props.theme.monotone || light.monotone).grey200};
        `}
      }
    }

    .th {
      height: ${BASE_ROW_HEIGHT}px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &.sticky {
      overflow: auto;
    }

    .header {
      overflow: hidden;
    }
  }
`

function estimateCellHeight({ original }) {
  const maxLength = Math.max(...original.map(val => val?.length || 0));
  const totalWidth = maxLength * WIDTH_OF_CHARACTER;
  const numberOfLines = Math.ceil(totalWidth / (DEFAULT_COLUMN_WIDTH - (UNIT * 2)));
  return (Math.max(numberOfLines, 1) * REGULAR_LINE_HEIGHT) + (UNIT * 2);
}

function Table({
  columns,
  data,
  height,
  width,
}: TableProps) {
  const refHeader = useRef(null);
  const refListOuter = useRef(null);

  useEffect(() => {
    const onScrollCallback = (e) => {
      refHeader?.current?.scroll(e.target.scrollLeft, 0);
    };

    if (refListOuter) {
      refListOuter.current.addEventListener('scroll', onScrollCallback);
    }

    return () => {
      refListOuter?.current?.removeEventListener('scroll', onScrollCallback);
    }
  }, [
    refHeader,
    refListOuter,
  ]);

  const maxWidthOfFirstColumn =
    useMemo(() => (String(data?.length).length * WIDTH_OF_CHARACTER) + (UNIT * 2), [
      data,
    ]);

  const defaultColumn = useMemo(() => {
    const newWidth = width - (maxWidthOfFirstColumn + 2);
    const numberOfColumns = columns.length - 1;
    let defaultColumnWidth = DEFAULT_COLUMN_WIDTH;

    if ((defaultColumnWidth * numberOfColumns) < newWidth) {
      defaultColumnWidth = newWidth / numberOfColumns;
    }

    return {
      width: defaultColumnWidth,
    };
  }, [
    columns,
    maxWidthOfFirstColumn,
    width,
  ]);

  // const scrollBarSize = useMemo(() => scrollbarWidth(), []);

  const {
    getTableBodyProps,
    getTableProps,
    headerGroups,
    prepareRow,
    rows,
    totalColumnsWidth,
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
    },
    useBlockLayout,
    useSticky,
  );

  const RenderRow = useCallback(({ index, style }) => {
    const row = rows[index];
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
          const firstColumn = idx === 0;
          const cellProps = cell.getCellProps();
          const cellStyle: {
            [key: string]: number | string;
          } = {
            ...cellProps.style,
          };

          if (firstColumn) {
            cellStyle.fontFamily = MONO_FONT_FAMILY_REGULAR;
            cellStyle.left = 0;
            cellStyle.position = 'sticky';
            cellStyle.textAlign = 'center';
            cellStyle.width = maxWidthOfFirstColumn;
          }

          return (
            <div
              {...cellProps}
              className="td"
              style={cellStyle}
            >
              {firstColumn && cell.render('Cell')}
              {!firstColumn && original[idx - 1]}
            </div>
          )
        })}
      </div>
    )
  }, [
    prepareRow,
    rows,
  ]);

  return (
    <div
      {...getTableProps()}
      className="table sticky"
      style={{
        width,
      }}
    >
      <div {...getTableBodyProps()} className="body">
        <div
          className="header"
          ref={refHeader}
        >
          {headerGroups.map(headerGroup => (
            <div
              {...headerGroup.getHeaderGroupProps()}
              className="tr"
            >
              {headerGroup.headers.map((column, idx: number) => {
                const firstColumn = idx === 0;
                const columnProps = column.getHeaderProps();
                const columnStyle: {
                  [key: string]: number | string;
                } = {
                  ...columnProps.style,
                };

                if (firstColumn) {
                  columnStyle.fontFamily = MONO_FONT_FAMILY_REGULAR;
                  columnStyle.left = 0;
                  columnStyle.position = 'sticky';
                  columnStyle.textAlign = 'center';
                  columnStyle.width = maxWidthOfFirstColumn;
                }

                return (
                  <div
                    {...columnProps}
                    className="th"
                    style={columnStyle}
                    title={firstColumn ? 'Row number' : `${column.Header}`}
                  >
                    {column.render('Header')}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <VariableSizeList
          estimatedItemSize={BASE_ROW_HEIGHT}
          height={height - BASE_ROW_HEIGHT}
          itemCount={rows?.length}
          itemSize={(idx: number) => estimateCellHeight(rows[idx])}
          outerRef={refListOuter}
          style={{
            overflow: 'auto',
          }}
        >
          {RenderRow}
        </VariableSizeList>
      </div>
    </div>
  )
}

function DataTable({
  columns: columnsProp,
  height,
  rows: rowsProp,
  width,
}: DataTableProps) {
  const columns = useMemo(() => [{
    Header: ' ',
    accessor: (row, i) => i + 1,
    sticky: 'left',
    // @ts-ignore
  }].concat(columnsProp?.map(col => ({
    Header: col,
    accessor: col,
  }))), [columnsProp]);

  const data = useMemo(() => rowsProp?.map(row => row.reduce((acc, v, i) => ({
    ...acc,
    [columnsProp[i]]: v,
  }), {})), [
    columnsProp,
    rowsProp,
  ]);

  return (
    <Styles height={height}>
      <Table
        columns={columns}
        data={rowsProp}
        height={height}
        width={width}
      />
    </Styles>
  )
}

export default DataTable
