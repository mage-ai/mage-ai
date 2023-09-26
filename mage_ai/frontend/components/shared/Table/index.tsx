import NextLink from 'next/link';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu, { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import Headline from '@oracle/elements/Headline';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import dark from '@oracle/styles/themes/dark';
import usePrevious from '@utils/usePrevious';
import {
  MENU_WIDTH,
  SortDirectionEnum,
  SortQueryEnum,
} from './constants';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { SortAscending, SortDescending } from '@oracle/icons';
import {
  SortIconContainerStyle,
  TableDataStyle,
  TableHeadStyle,
  TableRowStyle,
  TableStyle,
} from './index.style';
import { goToWithQuery } from '@utils/routing';
import { set } from '@storage/localStorage';
import { sortByKey } from '@utils/array';

export type ColumnType = {
  center?: boolean;
  fitTooltipContentWidth?: boolean;
  label?: (opts?: {
    columnIndex?: number;
    groupIndex?: number;
  }) => any | string;
  tooltipAppearAfter?: boolean;
  tooltipMessage?: string
  tooltipWidth?: number;
  uuid: string;
};

export type SortedColumnType = {
  columnIndex: number;
  sortDirection: SortDirectionEnum;
};

type TableProps = {
  alignTop?: boolean;
  borderCollapseSeparate?: boolean;
  buildLinkProps?: (rowIndex: number) => {
    as: string;
    href: string;
  };
  buildRowProps?: (rowIndex: number) => {
    renderCell: (cell: any, colIndex: number) => any;
    renderRow: (cells: any) => any;
  };
  columnBorders?: boolean;
  columnFlex: number[];
  columnMaxWidth?: (colIndex: number) => string;
  columns?: ColumnType[];
  compact?: boolean;
  defaultSortColumnIndex?: number;
  getUUIDFromRow?: (row: React.ReactElement[]) => string;
  getUniqueRowIdentifier?: (row: React.ReactElement[]) => string;
  groupsInline?: boolean;
  highlightRowOnHover?: boolean;
  localStorageKeySortColIdx?: string;
  localStorageKeySortDirection?: string;
  isSelectedRow?: (rowIndex: number) => boolean;
  menu?: any;
  noBorder?: boolean;
  noHeader?: boolean;
  onClickRow?: (index: number) => void;
  onDoubleClickRow?: (index: number) => void;
  onRightClickRow?: (index: number, event?: any) => void;
  renderRightClickMenu?: (rowIndex: number) => any;
  renderRightClickMenuItems?: (rowIndex: number) => FlyoutMenuItemType[];
  rightClickMenuWidth?: number;
  rowGroupHeaders?: string[] | any[];
  rowVerticalPadding?: number;
  rows: any[][];
  rowsGroupedByIndex?: number[][] | string[][];
  setRowsSorted?: (rows: React.ReactElement[][]) => void;
  sortableColumnIndexes?: number[];
  sortedColumn?: SortedColumnType;
  stickyFirstColumn?: boolean;
  stickyHeader?: boolean;
  uuidColumnIndex?: number;
  uuid?: string;
  wrapColumns?: boolean;
};

function Table({
  alignTop,
  borderCollapseSeparate,
  buildLinkProps,
  buildRowProps,
  columnBorders,
  columnFlex,
  columnMaxWidth,
  columns = [],
  compact,
  defaultSortColumnIndex,
  getUUIDFromRow,
  getUniqueRowIdentifier,
  groupsInline,
  highlightRowOnHover,
  isSelectedRow,
  localStorageKeySortColIdx,
  localStorageKeySortDirection,
  menu,
  noBorder,
  noHeader,
  onClickRow,
  onDoubleClickRow,
  onRightClickRow,
  renderRightClickMenu,
  renderRightClickMenuItems,
  rightClickMenuWidth = MENU_WIDTH,
  rowGroupHeaders,
  rowVerticalPadding,
  rows,
  rowsGroupedByIndex,
  setRowsSorted,
  sortableColumnIndexes,
  sortedColumn: sortedColumnInit,
  stickyFirstColumn,
  stickyHeader,
  uuidColumnIndex,
  uuid,
  wrapColumns,
}: TableProps, ref) {
  const [coordinates, setCoordinates] = useState<{
    x: number;
    y: number;
  }>(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(null);
  const [hoveredColumnIdx, setHoveredColumnIdx] = useState<number>(null);
  const [sortedColumn, setSortedColumn] = useState<SortedColumnType>(sortedColumnInit);
  const sortedColumnIndex = useMemo(() => sortedColumn?.columnIndex, [sortedColumn]);
  const sortedColumnDirection = useMemo(() => sortedColumn?.sortDirection, [sortedColumn]);

  const totalFlex = useMemo(() => columnFlex.reduce((acc, val) => acc + (val || 0), 0), [
    columnFlex,
  ]);
  const calculateCellWidth = useCallback((idx: number) => {
    if (columnFlex[idx]) {
      const width = Math.round(100 * (columnFlex[idx] / totalFlex));
      return `${width}%`;
    }

    return null;
  }, [columnFlex, totalFlex]);

  const handleClick = useCallback(() => setCoordinates(null), [
    setCoordinates,
  ]);
  useEffect(() => {
    document?.addEventListener('click', handleClick);

    return () => {
      document?.removeEventListener('click', handleClick);
    };
  }, [
    handleClick,
  ]);

  const hasRightClickMenu = useMemo(() => renderRightClickMenu || renderRightClickMenuItems, [
    renderRightClickMenu,
    renderRightClickMenuItems,
  ]);

  const rightClickMenu = useMemo(() => {
    if (!hasRightClickMenu) {
      return null;
    }

    const {
      x: xContainer,
      width,
    } = ref?.current?.getBoundingClientRect() || {};
    const {
      x = 0,
      y = 0,
    } = coordinates || {};
    let xFinal = x;
    if (x + rightClickMenuWidth >= xContainer + width) {
      xFinal = (xContainer + width) - (rightClickMenuWidth + UNIT);
    }
    if (xFinal < 0) {
      xFinal = 0;
    }

    return (
      <div
        style={{
          left: xFinal,
          position: 'fixed',
          top: y + (UNIT / 2),
          zIndex: 100,
        }}
      >
        {renderRightClickMenu?.(focusedRowIndex)}
        {renderRightClickMenuItems && (
          <FlyoutMenu
            items={renderRightClickMenuItems(focusedRowIndex) || []}
            open
            parentRef={undefined}
            uuid="FileBrowser/ContextMenu"
            width={rightClickMenuWidth}
          />
        )}
      </div>
    );
  }, [
    coordinates,
    focusedRowIndex,
    hasRightClickMenu,
    ref,
    renderRightClickMenu,
    renderRightClickMenuItems,
    rightClickMenuWidth,
  ]);

  const rowsSorted = useMemo(() => ((setRowsSorted && sortedColumn)
    ?
      sortByKey(
        rows,
        (row) => {
          const columnIndex = typeof sortedColumnIndex === 'number'
            ? sortedColumnIndex
            : defaultSortColumnIndex;
          const sortColumn = row?.[columnIndex];
          let sortValue = sortColumn?.props?.children;

          if (getUUIDFromRow && columnIndex === uuidColumnIndex) {
            sortValue = getUUIDFromRow?.(row);
          } else {
            const maxDepth = 10;
            let currentDepth = 0;
            while (typeof sortValue !== 'string' && typeof sortValue !== 'number'
              && currentDepth < maxDepth
            ) {
              sortValue = sortValue?.props?.children;
              currentDepth += 1;
              if (typeof sortValue === 'undefined') {
                sortValue = '';
              }
            }
          }

          return sortValue;
        },
        {
          ascending: sortedColumnDirection !== SortDirectionEnum.DESC,
        },
      )
    : rows
  ), [
    defaultSortColumnIndex,
    getUUIDFromRow,
    rows,
    setRowsSorted,
    sortedColumn,
    sortedColumnDirection,
    sortedColumnIndex,
    uuidColumnIndex,
  ]);

  const sortedRowIds = useMemo(
    () => (getUniqueRowIdentifier
      ? rowsSorted?.map(row => getUniqueRowIdentifier?.(row))
      : undefined
    ),
    [getUniqueRowIdentifier, rowsSorted],
  );
  const sortedColumnPrev = usePrevious(sortedColumn);
  const sortedRowIdsPrev = usePrevious(sortedRowIds);
  useEffect(() => {
    /*
     * The rows can change order without a change in sorting (e.g. due to a
     * column value being updated). As a result, we need to check the row
     * order and update the rowsSorted state in order to perform actions on
     * the correct row.
     */
    if (sortableColumnIndexes
      && (JSON.stringify(sortedColumn) !== JSON.stringify(sortedColumnPrev)
        || (sortedRowIdsPrev?.length > 0
          && JSON.stringify(sortedRowIds) !== JSON.stringify(sortedRowIdsPrev))
      )
    ) {
      setRowsSorted?.(rowsSorted);
      const sortColIdx = typeof sortedColumnIndex === 'number'
        ? sortedColumnIndex
        : null;
      const sortDirection = sortedColumnDirection || null;

      if (localStorageKeySortColIdx) {
        set(localStorageKeySortColIdx, sortColIdx);
      }
      if (localStorageKeySortDirection) {
        set(localStorageKeySortDirection, sortDirection);
      }

      goToWithQuery({
        [SortQueryEnum.SORT_COL_IDX]: sortColIdx,
        [SortQueryEnum.SORT_DIRECTION]: sortDirection,
      }, {
        pushHistory: true,
      });
    }
  }, [
    defaultSortColumnIndex,
    localStorageKeySortColIdx,
    localStorageKeySortDirection,
    rowsSorted,
    setRowsSorted,
    sortableColumnIndexes,
    sortedColumn,
    sortedColumnIndex,
    sortedColumnDirection,
    sortedColumnPrev,
    sortedRowIds,
    sortedRowIdsPrev,
  ]);

  const rowEls = useMemo(() => rowsSorted?.map((cells, rowIndex) => {
    const linkProps = buildLinkProps?.(rowIndex);
    const rowProps = buildRowProps?.(rowIndex) || {
      renderCell: null,
      renderRow: null,
    };
    const {
      renderCell,
      renderRow,
    } = rowProps;

    const cellEls = [];
    cells.forEach((cell, colIndex) => {
      let cellEl;
      if (renderCell) {
        cellEl = renderCell(cell, colIndex);
      }

      if (!cellEl) {
        cellEl = (
          <TableDataStyle
            alignTop={alignTop}
            columnBorders={columnBorders}
            compact={compact}
            key={`${uuid}-row-${rowIndex}-cell-${colIndex}`}
            last={colIndex === cells.length - 1}
            maxWidth={columnMaxWidth?.(colIndex)}
            noBorder={noBorder}
            rowVerticalPadding={rowVerticalPadding}
            selected={isSelectedRow?.(rowIndex)}
            stickyFirstColumn={stickyFirstColumn && colIndex === 0}
            width={calculateCellWidth(colIndex)}
            wrapColumns={wrapColumns}
          >
            {cell}
          </TableDataStyle>
        );
      }

      cellEls.push(cellEl);
    });
    let rowEl;
    if (renderRow) {
      rowEl = renderRow(cellEls);
    } else {
      const handleRowClick = (rowIndex: number, event: React.MouseEvent) => {
        if (event?.detail === 1) {
          onClickRow(rowIndex);
        } else if (onDoubleClickRow && event?.detail === 2) {
          onDoubleClickRow(rowIndex);
        }
      };

      rowEl = (
        <TableRowStyle
          highlightOnHover={highlightRowOnHover}
          key={`${uuid}-row-${rowIndex}`}
          noHover={!(linkProps || onClickRow)}
          // @ts-ignore
          onClick={onClickRow ? (e) => handleRowClick(rowIndex, e) : null}
          onContextMenu={hasRightClickMenu
            ? (e) => {
              e.preventDefault();

              setCoordinates({
                x: e.pageX,
                y: e.pageY,
              });
              setFocusedRowIndex(rowIndex);
              onRightClickRow?.(rowIndex, e);
            }
            : null
          }
        >
          {cellEls}
        </TableRowStyle>
      );
    }

    if (linkProps) {
      return (
        <NextLink
          {...linkProps}
          key={`${uuid}-row-link-${rowIndex}`}
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    alignTop,
    buildLinkProps,
    buildRowProps,
    calculateCellWidth,
    columnBorders,
    columnMaxWidth,
    compact,
    hasRightClickMenu,
    highlightRowOnHover,
    isSelectedRow,
    noBorder,
    onClickRow,
    onDoubleClickRow,
    onRightClickRow,
    rowVerticalPadding,
    rowsSorted,
    setFocusedRowIndex,
    sortedColumn,   // Included in dep array so table rows re-render when sorting column changes
    stickyFirstColumn,
    uuid,
    wrapColumns,
  ]);

  const renderHeaderRow = useCallback(({
    groupIndex,
  }: {
    groupIndex?: number;
  } = {}) => (
    <TableRowStyle noHover>
      {columns?.map((col, idx) => {
        const {
          center,
          fitTooltipContentWidth,
          label,
          tooltipAppearAfter,
          tooltipMessage,
          tooltipWidth,
          uuid: columnUUID,
        } = col || {};
        const isSortable = sortableColumnIndexes?.includes(idx);
        const headerTextEl = (
          <>
            <Text
              bold
              cyan={sortedColumnIndex === idx}
              leftAligned
              monospace
              muted
            >
              {label ? label({
                columnIndex: idx,
                groupIndex,
              }) : columnUUID}
            </Text>
            {tooltipMessage && (
              <Spacing ml="4px">
                <Tooltip
                  appearBefore={!tooltipAppearAfter}
                  label={(
                    <Text leftAligned>
                      {tooltipMessage}
                    </Text>
                  )}
                  lightBackground
                  maxWidth={tooltipWidth}
                  muted
                  widthFitContent={fitTooltipContentWidth}
                />
              </Spacing>
            )}
          </>
        );

        return (
          <TableHeadStyle
            columnBorders={columnBorders}
            compact={compact}
            key={`${uuid}-col-${columnUUID}-${idx}`}
            last={idx === columns.length - 1}
            noBorder={noBorder}
            onMouseEnter={isSortable ? () => setHoveredColumnIdx(idx) : null}
            onMouseLeave={isSortable ? () => setHoveredColumnIdx(null) : null}
            sticky={stickyHeader}
          >
            <FlexContainer
              alignItems="center"
              justifyContent={center ? 'center': 'flex-start'}
            >
              {isSortable
                ? (
                  <Link
                    fullHeight
                    fullWidth
                    noHoverUnderline
                    noOutline
                    onClick={() => {
                      setSortedColumn(prevState => {
                        const { columnIndex, sortDirection } = prevState || {};
                        let updatedSortedColumnState = {
                          columnIndex: idx,
                          sortDirection: SortDirectionEnum.ASC,
                        };
                        if (prevState && columnIndex === idx) {
                          if (sortDirection === SortDirectionEnum.ASC) {
                            updatedSortedColumnState.sortDirection = SortDirectionEnum.DESC;
                          } else if (sortDirection === SortDirectionEnum.DESC) {
                            updatedSortedColumnState = null;
                          }
                        }

                        return updatedSortedColumnState;
                      });
                    }}
                    preventDefault
                  >
                    <FlexContainer alignItems="center">
                      {headerTextEl}
                      <SortIconContainerStyle
                        active={idx === hoveredColumnIdx || idx === sortedColumnIndex}
                      >
                        {(SortDirectionEnum.DESC === sortedColumnDirection
                          && idx === sortedColumnIndex)
                          ? <SortDescending fill={dark.accent.cyan} />
                          : <SortAscending fill={dark.accent.cyan} />
                        }
                      </SortIconContainerStyle>
                    </FlexContainer>
                  </Link>
                ) : headerTextEl
              }
            </FlexContainer>
          </TableHeadStyle>
        );
      })}
    </TableRowStyle>
  ), [
    columnBorders,
    columns,
    compact,
    hoveredColumnIdx,
    noBorder,
    sortableColumnIndexes,
    sortedColumnDirection,
    sortedColumnIndex,
    stickyHeader,
    uuid,
  ]);

  const tableEl = useMemo(() => {
    if (rowGroupHeaders?.length >= 1 && rowsGroupedByIndex?.length >= 1) {
      // @ts-ignore
      return rowsGroupedByIndex?.reduce((acc, indexes: number[], idx: number) => {
        const els = indexes?.map((idx2: number) => rowEls?.[idx2]);
        if (els?.length >= 1) {
          const header = rowGroupHeaders[idx];
          const key = `table-group-${idx}`;

          if (groupsInline) {
            acc.push(
              <div
                key={key}
              >
                {header && (
                  <>
                    {typeof header === 'string' && (
                      <>
                        <Spacing p={PADDING_UNITS}>
                          <Headline level={5}>
                            {header}
                          </Headline>
                        </Spacing>

                        <Divider light />
                      </>
                    )}

                    {typeof header !== 'string' && header}
                  </>
                )}

                <TableStyle
                  borderCollapseSeparate={borderCollapseSeparate}
                  columnBorders={columnBorders}
                >
                  <>
                    {(columns?.length >= 1 && !noHeader) && renderHeaderRow({
                      groupIndex: idx,
                    })}
                    {els}
                  </>
                </TableStyle>
              </div>
            );
          } else {
            acc.push(
              // @ts-ignore
              <Spacing key={key} mt={idx >= 1 ? 2 : 0}>
                <Accordion
                  visibleMapping={{
                    '0': true,
                  }}
                >
                  <AccordionPanel
                    noPaddingContent
                    title={header}
                  >
                    <TableStyle
                      borderCollapseSeparate={borderCollapseSeparate}
                      columnBorders={columnBorders}
                    >
                      <>
                        {(columns?.length >= 1 && !noHeader) && renderHeaderRow({
                          groupIndex: idx,
                        })}
                        {els}
                      </>
                    </TableStyle>
                  </AccordionPanel>
                </Accordion>
              </Spacing>,
            );
          }
        }

        return acc;
      }, []);
    }

    return (
      <TableStyle
        borderCollapseSeparate={borderCollapseSeparate}
        columnBorders={columnBorders}
      >
        {(columns?.length >= 1 && !noHeader) && renderHeaderRow()}
        {rowEls}
      </TableStyle>
    );
  }, [
    borderCollapseSeparate,
    columnBorders,
    columns?.length,
    groupsInline,
    noHeader,
    renderHeaderRow,
    rowEls,
    rowGroupHeaders,
    rowsGroupedByIndex,
  ]);

  return (
    <div style={{ position: 'relative' }}>
      {tableEl}
      {menu}
      {hasRightClickMenu && coordinates && rightClickMenu}
    </div>
  );
}

export default React.forwardRef(Table);
