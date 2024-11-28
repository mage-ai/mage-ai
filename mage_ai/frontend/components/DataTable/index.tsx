import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import Link from '@oracle/elements/Link';
import NextLink from 'next/link';
import styled from 'styled-components';
import { VariableSizeList } from 'react-window';
import { TableHeaderProps, useBlockLayout, useTable } from 'react-table';
import { useSticky } from 'react-table-sticky';

import FlexContainer from '@oracle/components/FlexContainer';
import Text from '@oracle/elements/Text';
import dark from '@oracle/styles/themes/dark';
import light from '@oracle/styles/themes/light';
import scrollbarWidth from './scrollbarWidth';
import { FONT_FAMILY_REGULAR, MONO_FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { REGULAR, REGULAR_LINE_HEIGHT, SMALL } from '@oracle/styles/fonts/sizes';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { TAB_REPORTS } from '@components/datasets/overview/constants';
import { ThemeContext } from 'styled-components';
import { UNIT } from '@oracle/styles/units/spacing';
import { createDatasetTabRedirectLink } from '@components/utils';
import { range, sum } from '@utils/array';
import { isObject } from '@utils/hash';
import { isJsonString } from '@utils/string';

const BASE_ROW_HEIGHT = UNIT * 2 + REGULAR_LINE_HEIGHT;
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
  renderColumnHeader?: (
    column: any,
    idx: number,
    opts: {
      width: number;
    },
  ) => any;
  renderColumnHeaderCell?: (
    column: any,
    idx: number,
    opts: {
      index: boolean;
      key: string;
      props: TableHeaderProps;
      style: {
        [key: string]: number | string;
      };
      width: number;
    },
  ) => any;
  width?: number;
};

type TableProps = {
  columns: {
    Header: string;
    accessor: (row: any, i: number) => string | number;
    sticky?: string;
  }[];
  data: (string | number | { [key: string]: string | number | boolean } | (string | number)[])[][];
  numberOfIndexes: number;
} & SharedProps;

type DataTableProps = {
  columns: string[];
  disableZeroIndexRowNumber?: boolean;
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
  ${props =>
    props.disableScrolling &&
    `
    overflow: hidden;
  `}

  ${props =>
    props.height &&
    `
    height: ${props.height}px;
  `}

  ${props =>
    props.maxHeight &&
    `
    max-height: ${props.maxHeight}px;
  `}

  .body > div {
    ${ScrollbarStyledCss}
  }

  .table {
    border-spacing: 0;
    display: inline-block;

    ${props =>
      !props.noBorderBottom &&
      `
      border-bottom: 1px solid ${(props.theme.borders || light.borders).medium};
    `}

    ${props =>
      !props.noBorderLeft &&
      `
      border-left: 1px solid ${(props.theme.borders || light.borders).medium};
    `}

    ${props =>
      !props.noBorderRight &&
      `
      border-right: 1px solid ${(props.theme.borders || light.borders).medium};
    `}

    ${props =>
      !props.noBorderTop &&
      `
      border-top: 1px solid ${(props.theme.borders || light.borders).medium};
    `}

    .tr {
      .td.td-index-column {
        ${props => `
          ${SMALL}
          color: ${(props.theme.content || dark.content).disabled};
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
        background-color: ${(props.theme.background || dark.background).table};
        border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
        border-right: 1px solid ${(props.theme.borders || dark.borders).medium};
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

const CellStyle = styled.div`
  overflow: hidden;
  ${ScrollbarStyledCss}
`;

const PreStyle = styled.pre`
  overflow: auto;
  ${ScrollbarStyledCss}
`;

function estimateCellHeight({
  original,
  values,
  variableListProps,
  width,
}: {
  original: (string | number | (string | number)[])[];
  values: {
    [key: string]: string | number | (string | number)[];
  };
  variableListProps?: {
    columnHeaderHeight: number;
    height: number;
    maxHeight: number;
    width: number;
  };
  width: number;
}) {
  if (
    Array.isArray(original) &&
    original?.length >= 1 &&
    original?.every(o => Array.isArray(o) || isObject(o)) &&
    variableListProps
  ) {
    const { columnHeaderHeight, height, maxHeight } = variableListProps;

    return original?.reduce((acc: number, vals: any) => {
      let rows = [];

      const valueIsObject = isObject(vals);

      if (valueIsObject) {
        rows = [
          Object.entries(vals).reduce(
            (acc, [key, value]) => ({
              original: acc.original.concat(value),
              values: {
                ...acc.values,
                [key]: values,
              },
            }),
            {
              original: [],
              values: {},
            },
          ),
        ];
      } else if (Array.isArray(vals)) {
        rows = vals?.map((v, i) => ({
          original: [v],
          values: {
            [i]: v,
          },
        }));
      }

      const columnHeight: number = getVariableListHeight(
        columnHeaderHeight || BASE_ROW_HEIGHT,
        height,
        maxHeight,
        rows,
        width,
      );

      return acc + columnHeight;
    }, 0);
  }

  const columns = original?.length;
  const maxLength = Array.isArray(original)
    ? Math.max(...original.map(val => String(val)?.length || 0))
    : String(original)?.length || 0;
  const totalWidth = maxLength * WIDTH_OF_CHARACTER;

  const columnWidth = columns * totalWidth;
  const coverage = columnWidth / width;

  const numberOfLines =
    coverage > 1 ? Math.ceil(totalWidth / (DEFAULT_COLUMN_WIDTH - UNIT * 2)) : 1;

  return Math.max(numberOfLines, 1) * REGULAR_LINE_HEIGHT + UNIT * 2;
}

function getVariableListHeight(
  columnHeaderHeight: number,
  height: number,
  maxHeight: number,
  rows: {
    original: (string | number | (string | number)[])[];
    values: {
      [key: string]: string | number | (string | number)[];
    };
  }[],
  width: number,
) {
  let val: number = 0;

  if (maxHeight) {
    val = sum(
      rows.map(row =>
        estimateCellHeight({
          ...row,
          variableListProps: {
            columnHeaderHeight,
            height,
            maxHeight,
            width,
          },
          width,
        }),
      ),
    );
    if (columnHeaderHeight) {
      val += columnHeaderHeight;
    } else {
      val += BASE_ROW_HEIGHT - REGULAR_LINE_HEIGHT;
    }
  } else if (height) {
    val = height;
    if (columnHeaderHeight) {
      val -= columnHeaderHeight;
    } else {
      val -= BASE_ROW_HEIGHT;
    }
  } else {
    return 0;
  }

  return val;
}

function buildIndexColumns(
  numberOfIndexes: number,
  opts: {
    disableZeroIndexRowNumber?: boolean;
  } = {},
): {
  Header: string;
  accessor: (row: any, i: number) => string;
  sticky?: string;
}[] {
  return range(numberOfIndexes).map((i: number, idx: number) => ({
    Header: range(idx + 1)
      .map(() => ' ')
      .join(' '),
    accessor: (_: any, indexNumber: number) =>
      String(indexNumber + (opts?.disableZeroIndexRowNumber ? 1 : 0)),
    sticky: 'left',
  }));
}

function Table({ ...props }: TableProps) {
  const {
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
    renderColumnHeaderCell,
    width,
  } = props;

  const themeContext = useContext(ThemeContext);
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

  const shouldUseIndexProp = useMemo(
    () => indexProp && data && indexProp.length === data.length,
    [data, indexProp],
  );

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

      arr.push(maxLength + UNIT * 2);
    });

    return arr;
  }, [data, indexProp, numberOfIndexes, shouldUseIndexProp]);

  const columnsAll = columns.map(col => col?.Header).slice(1);
  const scrollBarSize = useMemo(() => scrollbarWidth(), []);
  const defaultColumn = useMemo(() => {
    // UNIT * 1.5 is just extra
    const newWidth = width - (Math.max(...maxWidthOfIndexColumns) + UNIT * 1.5 + scrollBarSize);
    const numberOfColumns = columns.length - 1;
    let defaultColumnWidth = DEFAULT_COLUMN_WIDTH;

    if (defaultColumnWidth * numberOfColumns < newWidth) {
      defaultColumnWidth = newWidth / numberOfColumns;
    }

    return {
      width: defaultColumnWidth,
    };
  }, [columns, maxWidthOfIndexColumns, scrollBarSize, width]);

  const { getTableBodyProps, getTableProps, headerGroups, prepareRow, rows } = useTable(
    {
      columns,
      data,
      defaultColumn,
    },
    useBlockLayout,
    useSticky,
  );

  const renderRow = useCallback(
    ({ index, style }) => {
      const removedRowIndexes = new Set(previewIndexes?.removedRows || []);

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

            let indexColumnValue: any;

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

            let cellValueDisplay = cellValue;
            if (cellValue === true) {
              cellValueDisplay = 'True';
            } else if (cellValue === false) {
              cellValueDisplay = 'False';
            } else if (cellValue === null || cellValue === 'null') {
              cellValueDisplay = 'None';
            } else if (
              cellValue !== true &&
              cellValue !== false &&
              cellValue !== null &&
              cellValue !== 'null' &&
              typeof cellValue === 'string' &&
              cellValue?.length >= 1
            ) {
              if (isJsonString(cellValue)) {
                try {
                  const cellObject = JSON.parse(cellValue);
                  if (Array.isArray(cellObject) || isObject(cellObject)) {
                    cellStyle.overflow = 'auto';
                    // Render JSON object as formmated text
                    cellValueDisplay = (
                      <PreStyle>
                        <Text default wordBreak>
                          {JSON.stringify(cellObject, null, 2)}
                        </Text>
                      </PreStyle>
                    );
                  }
                } catch {}
              }
            }

            return (
              <CellStyle
                {...cellProps}
                className={`td ${indexColumn ? 'td-index-column' : ''}`}
                key={`${idx}-${cellValue}`}
                style={cellStyle}
              >
                {indexColumnValue}
                {!indexColumn && (
                  <FlexContainer justifyContent="space-between">
                    {typeof cellValueDisplay === 'object' ? (
                      cellValueDisplay
                    ) : (
                      <Text danger={isInvalid} default wordBreak>
                        {cellValueDisplay}
                      </Text>
                    )}
                    {isInvalid && (
                      <NextLink
                        as={createDatasetTabRedirectLink(TAB_REPORTS, columnIndex)}
                        href="/datasets/[...slug]"
                        passHref
                      >
                        <Link danger>View all</Link>
                      </NextLink>
                    )}
                  </FlexContainer>
                )}
              </CellStyle>
            );
          })}
        </div>
      );
    },
    [
      columnsAll,
      indexProp,
      invalidValues,
      maxWidthOfIndexColumns,
      numberOfIndexes,
      prepareRow,
      previewIndexes,
      rows,
      shouldUseIndexProp,
    ],
  );

  const variableListMemo = useMemo(
    () => (
      <VariableSizeList
        estimatedItemSize={BASE_ROW_HEIGHT}
        height={getVariableListHeight(columnHeaderHeight, height, maxHeight, rows, width)}
        itemCount={rows?.length}
        itemSize={(idx: number) => {
          const size = estimateCellHeight({
            ...rows[idx],
            variableListProps: {
              columnHeaderHeight,
              height,
              maxHeight,
              width,
            },
            width,
          });

          return size;
        }}
        outerRef={refListOuter}
        style={{
          maxHeight: maxHeight,
          pointerEvents: disableScrolling ? 'none' : null,
        }}
      >
        {renderRow}
      </VariableSizeList>
    ),
    [columnHeaderHeight, disableScrolling, height, maxHeight, renderRow, rows, width],
  );

  return (
    <div
      {...getTableProps()}
      className="table sticky"
      style={{
        width,
      }}
    >
      <div {...getTableBodyProps()} className="body">
        <div className="header" ref={refHeader}>
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
                } else {
                  columnStyle.color = (themeContext || dark).content.default;
                  columnStyle.padding = UNIT * 1;
                  columnStyle.minWidth = defaultColumn.width;
                }

                if (renderColumnHeaderCell) {
                  return renderColumnHeaderCell(column, idx - numberOfIndexes, {
                    index: indexColumn,
                    key: column.id,
                    props: columnProps,
                    style: columnStyle,
                    width: defaultColumn.width,
                  });
                } else if (renderColumnHeader) {
                  el = renderColumnHeader(column, idx - numberOfIndexes, {
                    width: defaultColumn.width,
                  });
                } else {
                  el = column.render('Header');
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
  disableZeroIndexRowNumber,
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
  renderColumnHeaderCell,
  rows: rowsProp,
  width,
}: DataTableProps) {
  const columnHeadersContainEmptyString = useMemo(
    () => columnsProp?.some(header => header === ''),
    [columnsProp],
  );

  const numberOfIndexes = useMemo(
    () => (index?.length ? (Array.isArray(index[0]) ? index[0].length : 1) : 1),
    [index],
  );

  const columns = useMemo(
    () =>
      columnHeadersContainEmptyString
        ? []
        : buildIndexColumns(numberOfIndexes, { disableZeroIndexRowNumber }).concat(
            columnsProp?.map(col => ({
              Header: String(col),
              accessor: () => String(col),
            })) as {
              Header: string;
              accessor: (row: any, i: number) => string;
              sticky?: string;
            }[],
          ),
    [columnsProp, columnHeadersContainEmptyString, disableZeroIndexRowNumber, numberOfIndexes],
  );

  const table = useMemo(
    () =>
      columnHeadersContainEmptyString ? null : (
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
          renderColumnHeaderCell={renderColumnHeaderCell}
          width={width}
        />
      ),
    [
      columnHeaderHeight,
      columnHeadersContainEmptyString,
      columns,
      rowsProp,
      disableScrolling,
      height,
      index,
      invalidValues,
      maxHeight,
      numberOfIndexes,
      previewIndexes,
      renderColumnHeader,
      renderColumnHeaderCell,
      width,
    ],
  );

  return (
    <Styles
      columnHeaderHeight={columnHeaderHeight}
      disableScrolling={disableScrolling}
      height={height}
      maxHeight={maxHeight ? maxHeight + 37 : maxHeight} // Add 37px so horizontal scrollbar is visible
      noBorderBottom={noBorderBottom}
      noBorderLeft={noBorderLeft}
      noBorderRight={noBorderRight}
      noBorderTop={noBorderTop}
    >
      {!columnHeadersContainEmptyString && table}
    </Styles>
  );
}

export default DataTable;
