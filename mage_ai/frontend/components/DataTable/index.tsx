import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import Link from '@oracle/elements/Link';
import NextLink from 'next/link';
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
import { range, sum } from '@utils/array';

const BASE_ROW_HEIGHT = (UNIT * 2) + REGULAR_LINE_HEIGHT;
const DEFAULT_COLUMN_WIDTH = UNIT * 20;
const WIDTH_OF_CHARACTER = 8.5;
export const WIDTH_OF_SINGLE_CHARACTER_MONOSPACE = 8.7;

type InvalidValueType = {
  [key: string]: number[];
};

type SharedProps = {
  columnHeaderHeight?: number;
  disableScrolling?: boolean;
  height?: number;
  index?: number[] | number[][] | string[] | string[][];
  invalidValues?: InvalidValueType;
  maxHeight?: number;
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
  numberOfIndexes: number;
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
  maxHeight?: number;
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

  ${props => props.maxHeight && `
    max-height: ${props.maxHeight}px;
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
      .td.td-index-column {
        ${props => `
          color: ${(props.theme.content || light.content).default};
        `}
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
  index: indexProp,
  invalidValues,
  maxHeight,
  numberOfIndexes,
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

  const shouldUseIndexProp = useMemo(() => indexProp && data && indexProp.length === data.length, [
    data,
    indexProp,
  ]);

  const maxWidthOfIndexColumns = useMemo(() => {
    const arr = [];

    range(numberOfIndexes).forEach((_, idx: number) => {
      let maxLength = String(data?.length).length * WIDTH_OF_SINGLE_CHARACTER_MONOSPACE;

      if (shouldUseIndexProp) {
        const charLengths = indexProp.map((i: number | number[] | string | string[]) => {
          if (numberOfIndexes >= 2) {
            return String(i[idx]).length;
          }

          return String(i).length;
        });

        maxLength = Math.max(...charLengths) * WIDTH_OF_SINGLE_CHARACTER_MONOSPACE;
      }

      arr.push(maxLength + (UNIT * 2));
    });

    return arr;
  }, [
    data,
    indexProp,
    numberOfIndexes,
    shouldUseIndexProp,
  ]);

  const columnsAll = columns.map(col => col?.Header).slice(1);
  const scrollBarSize = useMemo(() => scrollbarWidth(), []);
  const defaultColumn = useMemo(() => {
    // UNIT * 1.5 is just extra
    const newWidth = width - ((Math.max(...maxWidthOfIndexColumns) + (UNIT * 1.5)) + scrollBarSize);
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
    maxWidthOfIndexColumns,
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
  const removedRowIndexes = new Set(previewIndexes?.removedRows || []);

  const renderRow = useCallback(({ index, style }) => {
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
          const indexColumn = idx <= numberOfIndexes - 1;
          const cellProps = cell.getCellProps();
          const header = cell.column.id;
          const isInvalid = invalidValues?.[header]?.includes(index);
          const cellStyle: {
            [key: string]: number | string;
          } = {
            ...cellProps.style,
          };

          if (indexColumn) {
            cellStyle.fontFamily = MONO_FONT_FAMILY_REGULAR;
            cellStyle.left = 0;
            cellStyle.position = 'sticky';
            if (indexProp) {
              cellStyle.textAlign = 'right';
            } else {
              cellStyle.textAlign = 'center';
            }

            cellStyle.width = maxWidthOfIndexColumns[idx];
          }

          let cellValue = original[idx - numberOfIndexes];
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

          let indexColumnValue;

          if (indexColumn) {
            if (shouldUseIndexProp) {
              indexColumnValue = indexProp[index];
              if (Array.isArray(indexColumnValue)) {
                indexColumnValue = indexColumnValue[idx];
              }
            } else {
              indexColumnValue = cell.render('Cell');
            }
          }

          return (
            <div
              {...cellProps}
              className={`td ${indexColumn ? 'td-index-column' : ''}`}
              key={`${idx}-${cellValue}`}
              style={cellStyle}
            >
              {indexColumnValue}
              {!indexColumn && (
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
  }, [
    columnsAll,
    indexProp,
    invalidValues,
    maxWidthOfIndexColumns,
    numberOfIndexes,
    prepareRow,
    rows,
    shouldUseIndexProp,
  ]);

  const listHeight = useMemo(() => {
    let val;
    if (maxHeight) {
      val = sum(rows.map(estimateCellHeight));
      if (columnHeaderHeight) {
        val += columnHeaderHeight;
      } else {
        val += BASE_ROW_HEIGHT - REGULAR_LINE_HEIGHT;
      }
    } else {
      val = height;
      if (columnHeaderHeight) {
        val -= columnHeaderHeight;
      } else {
        val -= BASE_ROW_HEIGHT;
      }
    }

    return val;
  }, [
    columnHeaderHeight,
    height,
    maxHeight,
    rows,
  ]);

  const variableListMemo = useMemo(() => (
    <VariableSizeList
      estimatedItemSize={BASE_ROW_HEIGHT}
      height={listHeight}
      itemCount={rows?.length}
      itemSize={(idx: number) => estimateCellHeight(rows[idx])}
      outerRef={refListOuter}
      style={{
        maxHeight: maxHeight,
        pointerEvents: disableScrolling ? 'none' : null,
      }}
    >
      {renderRow}
    </VariableSizeList>
  ), [
    disableScrolling,
    listHeight,
    maxHeight,
    renderRow,
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
          {headerGroups.map((headerGroup, groupIdx) => (
            <div
              {...headerGroup.getHeaderGroupProps()}
              className="tr"
              key={`${headerGroup.id}_${groupIdx}`}
            >
              {headerGroup.headers.map((column, idx: number) => {
                const indexColumn = idx <= numberOfIndexes - 1;
                const columnProps = column.getHeaderProps();
                const columnStyle: {
                  [key: string]: number | string;
                } = {
                  ...columnProps.style,
                };

                let el;

                if (indexColumn) {
                  columnStyle.fontFamily = MONO_FONT_FAMILY_REGULAR;
                  columnStyle.left = 0;
                  columnStyle.position = 'sticky';
                  columnStyle.textAlign = 'center';
                  columnStyle.width = maxWidthOfIndexColumns[idx];
                  columnStyle.minWidth = maxWidthOfIndexColumns[idx];
                } else if (renderColumnHeader) {
                  el = renderColumnHeader(column, idx - numberOfIndexes, {
                    width: defaultColumn.width,
                  });
                } else {
                  el = column.render('Header');
                  columnStyle.color = (themeContext || dark).content.default;
                  columnStyle.padding = UNIT * 1;
                  columnStyle.minWidth = defaultColumn.width;
                }

                return (
                  <div
                    {...columnProps}
                    className="th"
                    key={column.id}
                    style={columnStyle}
                    title={indexColumn ? 'Row number' : undefined}
                  >
                    {el}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {variableListMemo}
      </div>
    </div>
  );
}

function DataTable({
  columnHeaderHeight,
  columns: columnsProp,
  disableScrolling,
  height,
  index,
  invalidValues,
  maxHeight,
  noBorderBottom,
  noBorderLeft,
  noBorderRight,
  noBorderTop,
  previewIndexes,
  renderColumnHeader,
  rows: rowsProp,
  width,
}: DataTableProps) {
  const numberOfIndexes = useMemo(() => index?.length
    ? (Array.isArray(index[0]) ? index[0].length : 1)
    : 1
  , [
    index,
  ]);

  const columns = useMemo(() => range(numberOfIndexes).map((i: number, idx: number) => ({
    Header: range(idx + 1).map(() => ' ').join(' '),
    accessor: (row, i) => i,
    sticky: 'left',
    // @ts-ignore
  })).concat(columnsProp?.map(col => ({
    Header: String(col),
    accessor: String(col),
  }))), [
    columnsProp,
    numberOfIndexes,
  ]);

  return (
    <Styles
      columnHeaderHeight={columnHeaderHeight}
      disableScrolling={disableScrolling}
      height={height}
      maxHeight={(maxHeight || 0) + 37}    // Add 37px so horizontal scrollbar is visible
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
        index={index}
        invalidValues={invalidValues}
        maxHeight={maxHeight}
        numberOfIndexes={numberOfIndexes}
        previewIndexes={previewIndexes}
        renderColumnHeader={renderColumnHeader}
        width={width}
      />
    </Styles>
  );
}

export default DataTable;
