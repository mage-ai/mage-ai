import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import Link from '@oracle/elements/Link';
import NextLink from 'next/link';
import router from 'next/router';
import styled from 'styled-components';
import { VariableSizeList } from 'react-window';
import {
  useBlockLayout,
  useTable,
} from 'react-table';
import { useSticky } from 'react-table-sticky';

import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import light from '@oracle/styles/themes/light';
import scrollbarWidth from './scrollbarWidth';
import {
  FONT_FAMILY_REGULAR,
  MONO_FONT_FAMILY_REGULAR,
} from '@oracle/styles/fonts/primary';
import {
  REGULAR,
  REGULAR_LINE_HEIGHT,
} from '@oracle/styles/fonts/sizes';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { TAB_REPORTS } from '@components/datasets/overview/constants';
import { ThemeContext } from 'styled-components';
import { UNIT } from '@oracle/styles/units/spacing';
import { createDatasetTabRedirectLink } from '@components/utils';

const BASE_ROW_HEIGHT = (UNIT * 2) + REGULAR_LINE_HEIGHT;
const DEFAULT_COLUMN_WIDTH = UNIT * 20;
const WIDTH_OF_CHARACTER = 8.5;

type InvalidValueType = {
  [key: string]: number[];
};

type SharedProps = {
  columnHeaderHeight?: number;
  disableScrolling?: boolean;
  height?: number;
  invalidValues?: InvalidValueType;
  previewIndexes?: {
    removedRows?: number[];
  };
  renderColumnHeader?: (column: any, idx: number, opts: {
    width: number;
  }) => any;
  width?: number;
};

type TableProps = {
  columns: {
    Header: string;
    accessor: (row: any, i: number) => string | number;
    sticky?: string;
  }[];
  data: string[][] | number[][];
} & SharedProps;

type DataTableProps = {
  columns: string[];
  noBorderBottom?: boolean;
  noBorderLeft?: boolean;
  noBorderRight?: boolean;
  noBorderTop?: boolean;
  rows: string[][] | number[][];
} & SharedProps;

const Styles = styled.div<{
  columnHeaderHeight?: number;
  disableScrolling?: boolean;
  height?: number;
  noBorderBottom?: boolean;
  noBorderLeft?: boolean;
  noBorderRight?: boolean;
  noBorderTop?: boolean;
}>`
  ${props => props.disableScrolling && `
    overflow: hidden;
  `}

  ${props => props.height && `
    height: ${props.height}px;
  `}

  .body > div {
    ${ScrollbarStyledCss}
  }

  .table {
    border-spacing: 0;
    display: inline-block;

    ${props => !props.noBorderBottom && `
      border-bottom: 1px solid ${(props.theme.borders || light.borders).medium};
    `}

    ${props => !props.noBorderLeft && `
      border-left: 1px solid ${(props.theme.borders || light.borders).medium};
    `}

    ${props => !props.noBorderRight && `
      border-right: 1px solid ${(props.theme.borders || light.borders).medium};
    `}

    ${props => !props.noBorderTop && `
      border-top: 1px solid ${(props.theme.borders || light.borders).medium};
    `}

    .tr {
      .td:first-child {
        ${props => `
          color: ${(props.theme.content || light.content).default};
        `}
      }

      :last-child {
        .td {
          border-bottom: 0;
        }
      }
    }

    .th {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;

      ${props => `
        height: ${props.columnHeaderHeight || BASE_ROW_HEIGHT}px;
      `}
    }

    .th,
    .td {
      ${REGULAR}
      font-family: ${FONT_FAMILY_REGULAR};
      margin: 0;

      ${props => `
        background-color: ${(props.theme.background || light.background).table};
        border-bottom: 1px solid ${(props.theme.borders || light.borders).medium};
        border-right: 1px solid ${(props.theme.borders || light.borders).medium};
      `}
      :last-child {
        ${props => `
          border-right: none;
        `}
      }
    }

    .td {
      padding: ${UNIT * 1}px;
    }

    &.sticky {
      overflow: auto;
    }

    .header {
      overflow: hidden;
    }
  }
`;

function estimateCellHeight({ original }) {
  const maxLength = Math.max(...original.map(val => val?.length || 0));
  const totalWidth = maxLength * WIDTH_OF_CHARACTER;
  const numberOfLines = Math.ceil(totalWidth / (DEFAULT_COLUMN_WIDTH - (UNIT * 2)));
  return (Math.max(numberOfLines, 1) * REGULAR_LINE_HEIGHT) + (UNIT * 2);
}

function Table({
  columnHeaderHeight,
  columns,
  data,
  disableScrolling,
  height,
  invalidValues,
  previewIndexes,
  renderColumnHeader,
  width,
}: TableProps) {
  const themeContext = useContext(ThemeContext);
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
    };
  }, [
    refHeader,
    refListOuter,
  ]);

  const maxWidthOfFirstColumn =
    useMemo(() => (String(data?.length).length * WIDTH_OF_CHARACTER) + (UNIT * 2), [
      data,
    ]);

  const columnsAll = columns.map(col => col?.Header).slice(1);
  const scrollBarSize = useMemo(() => scrollbarWidth(), []);
  const defaultColumn = useMemo(() => {
    const newWidth = width - (maxWidthOfFirstColumn + 2) - scrollBarSize;
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
    scrollBarSize,
    width,
  ]);

  const {
    getTableBodyProps,
    getTableProps,
    headerGroups,
    prepareRow,
    rows,
  } = useTable(
    {
      columns,
      data,
      defaultColumn,
    },
    useBlockLayout,
    useSticky,
  );
  const { slug = [] } = router.query;
  const removedRowIndexes = new Set(previewIndexes?.removedRows || []);

  const RenderRow = useCallback(({ index, style }) => {
    const row = rows[index];
    prepareRow(row);
    const { original } = row;
    const rowToBeRemoved = removedRowIndexes.has(index);

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
          const header = cell.column.id;
          const isInvalid = invalidValues?.[header]?.includes(index);
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

          let cellValue = original[idx - 1];
          const columnIndex = columnsAll.indexOf(header);
          if (isInvalid) {
            cellStyle.color = light.interactive.dangerBorder;
          }
          if (rowToBeRemoved) {
            cellStyle.backgroundColor = light.background.danger;
          }

          if (Array.isArray(cellValue) || typeof cellValue === 'object') {
            try {
              cellValue = JSON.stringify(cellValue);
            } catch {
              cellValue = 'Error: cannot display value';
            }
          }

          return (
            <div
              {...cellProps}
              className="td"
              key={`${idx}-${cellValue}`}
              style={cellStyle}
            >
              {firstColumn && cell.render('Cell')}
              {!firstColumn && (
                <FlexContainer justifyContent="space-between">
                  <Text danger={isInvalid} default wordBreak>
                    {cellValue === true && 'true'}
                    {cellValue === false && 'false'}
                    {(cellValue === null || cellValue === 'null') && 'null'}
                    {cellValue !== true
                      && cellValue !== false
                      && cellValue !== null
                      && cellValue !== 'null'
                      && cellValue
                    }
                  </Text>
                  {isInvalid && (
                    <NextLink
                      as={createDatasetTabRedirectLink(TAB_REPORTS, columnIndex)}
                      href="/datasets/[...slug]"
                      passHref
                    >
                      <Link danger>
                        View all
                      </Link>
                    </NextLink>
                  )}
                </FlexContainer>
              )}
            </div>
          );
        })}
      </div>
    );
  }, [invalidValues, maxWidthOfFirstColumn, prepareRow, rows, slug]);

  const listHeight = useMemo(() => {
    let val = height;
    if (columnHeaderHeight) {
      val -= columnHeaderHeight;
    } else {
      val -= BASE_ROW_HEIGHT;
    }

    return val;
  }, [
    columnHeaderHeight,
    height,
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
          {headerGroups.map((headerGroup, groupIdx) => (
            <div
              {...headerGroup.getHeaderGroupProps()}
              className="tr"
              key={`${headerGroup.id}_${groupIdx}`}
            >
              {headerGroup.headers.map((column, idx: number) => {
                const firstColumn = idx === 0;
                const columnProps = column.getHeaderProps();
                const columnStyle: {
                  [key: string]: number | string;
                } = {
                  ...columnProps.style,
                };

                let el;

                if (firstColumn) {
                  columnStyle.fontFamily = MONO_FONT_FAMILY_REGULAR;
                  columnStyle.left = 0;
                  columnStyle.position = 'sticky';
                  columnStyle.textAlign = 'center';
                  columnStyle.width = maxWidthOfFirstColumn;
                } else if (renderColumnHeader) {
                  el = renderColumnHeader(column, idx - 1, {
                    width: defaultColumn.width,
                  });
                } else {
                  el = column.render('Header');
                  columnStyle.color = (themeContext || dark).content.default;
                  columnStyle.padding = UNIT * 1;
                }

                return (
                  <div
                    {...columnProps}
                    className="th"
                    key={column.id}
                    style={columnStyle}
                    title={firstColumn ? 'Row number' : undefined}
                  >
                    {el}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <VariableSizeList
          estimatedItemSize={BASE_ROW_HEIGHT}
          height={listHeight}
          itemCount={rows?.length}
          itemSize={(idx: number) => estimateCellHeight(rows[idx])}
          outerRef={refListOuter}
          style={{
            overflow: disableScrolling ? 'hidden' : 'auto',
          }}
        >
          {RenderRow}
        </VariableSizeList>
      </div>
    </div>
  );
}

function DataTable({
  columnHeaderHeight,
  columns: columnsProp,
  disableScrolling,
  height,
  invalidValues,
  noBorderBottom,
  noBorderLeft,
  noBorderRight,
  noBorderTop,
  previewIndexes,
  renderColumnHeader,
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
    <Styles
      columnHeaderHeight={columnHeaderHeight}
      disableScrolling={disableScrolling}
      height={height}
      noBorderBottom={noBorderBottom}
      noBorderLeft={noBorderLeft}
      noBorderRight={noBorderRight}
      noBorderTop={noBorderTop}
    >
      <Table
        columnHeaderHeight={columnHeaderHeight}
        columns={columns}
        data={rowsProp}
        disableScrolling={disableScrolling}
        height={height}
        invalidValues={invalidValues}
        previewIndexes={previewIndexes}
        renderColumnHeader={renderColumnHeader}
        width={width}
      />
    </Styles>
  );
}

export default DataTable;
