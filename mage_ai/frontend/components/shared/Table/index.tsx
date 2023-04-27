import NextLink from 'next/link';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import Accordion from '@oracle/components/Accordion';
import AccordionPanel from '@oracle/components/Accordion/AccordionPanel';
import FlexContainer from '@oracle/components/FlexContainer';
import FlyoutMenu, { FlyoutMenuItemType } from '@oracle/components/FlyoutMenu';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import Text from '@oracle/elements/Text';
import Tooltip from '@oracle/components/Tooltip';
import {
  TableDataStyle,
  TableHeadStyle,
  TableRowStyle,
  TableStyle,
} from './index.style';
import { UNIT } from '@oracle/styles/units/spacing';
import { capitalize } from '@utils/string';

const MENU_WIDTH: number = UNIT * 20;

export type ColumnType = {
  center?: boolean;
  label?: () => any | string;
  tooltipMessage?: string
  uuid: string;
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
  grouping?: {
    column: string;
    columnIndex: number;
    values: string[];
  };
  highlightRowOnHover?: boolean;
  isSelectedRow?: (rowIndex: number) => boolean;
  noBorder?: boolean;
  noHeader?: boolean;
  onClickRow?: (index: number) => void;
  onDoubleClickRow?: (index: number) => void;
  onRightClickRow?: (index: number, event?: any) => void;
  renderRightClickMenu?: (rowIndex: number) => any;
  renderRightClickMenuItems?: (rowIndex: number) => FlyoutMenuItemType[];
  rows: any[][];
  rowVerticalPadding?: number;
  stickyFirstColumn?: boolean;
  stickyHeader?: boolean;
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
  grouping,
  highlightRowOnHover,
  isSelectedRow,
  noBorder,
  noHeader,
  onClickRow,
  onDoubleClickRow,
  onRightClickRow,
  renderRightClickMenu,
  renderRightClickMenuItems,
  rows,
  rowVerticalPadding,
  stickyFirstColumn,
  stickyHeader,
  uuid,
  wrapColumns,
}: TableProps, ref) {
  const [coordinates, setCoordinates] = useState<{
    x: number;
    y: number;
  }>(null);
  const [focusedRowIndex, setFocusedRowIndex] = useState<number>(null);

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
    if (x + MENU_WIDTH >= xContainer + width) {
      xFinal = (xContainer + width) - (MENU_WIDTH + UNIT);
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
            width={MENU_WIDTH}
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
  ]);

  const rowEls = useMemo(() => rows?.map((cells, rowIndex) => {
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
    rows,
    setFocusedRowIndex,
    stickyFirstColumn,
    uuid,
    wrapColumns,
  ]);

  const headerRowEl = useMemo(() => (
    <TableRowStyle noHover>
      {columns?.map((col, idx) => (
        <TableHeadStyle
          columnBorders={columnBorders}
          compact={compact}
          key={`${uuid}-col-${col.uuid}-${idx}`}
          last={idx === columns.length - 1}
          noBorder={noBorder}
          sticky={stickyHeader}
        >
          <FlexContainer
            alignItems="center"
            justifyContent={col.center ? 'center': 'flex-start'}
          >
            <Text bold leftAligned monospace muted>
              {col.label ? col.label() : col.uuid}
            </Text>
            {col.tooltipMessage && (
              <Spacing ml="4px">
                <Tooltip
                  appearBefore
                  label={(
                    <Text leftAligned>
                      {col.tooltipMessage}
                    </Text>
                  )}
                  lightBackground
                  primary
                />
              </Spacing>
            )}
          </FlexContainer>
        </TableHeadStyle>
      ))}
    </TableRowStyle>
  ), [columnBorders, columns, compact, noBorder, stickyHeader, uuid]);

  const tableEl = useMemo(() => {
    if (grouping && grouping?.column && grouping?.values?.length > 0) {
      const {
        columnIndex: groupingColumnIndex,
        values: groupingValues,
      } = grouping;
      const groupedRowElsByValue = rowEls?.reduce((acc, rowEl) => {
        const groupingValue = rowEl?.props?.children?.[groupingColumnIndex]?.props?.children?.props?.children;
        const groupingTitle = capitalize(groupingValue);
        if (groupingValues.includes(groupingValue)) {
          acc[groupingTitle] = (acc[groupingTitle] || []).concat(rowEl);
        }

        return acc;
      }, {});
      const rowElGroupings = Object.entries(groupedRowElsByValue)
        .sort((a, b) => a[0].localeCompare(b[0]));

      return (
        <>
          {rowElGroupings.map(([groupingValue, groupingRowEls], idx) => (
            <Spacing key={groupingValue} mb={idx === rowElGroupings.length - 1 ? 0 : 2}>
              <Accordion
                visibleMapping={{
                  '0': true,
                }}
              >
                <AccordionPanel
                  noPaddingContent
                  title={groupingValue}
                >
                  <TableStyle
                    borderCollapseSeparate={borderCollapseSeparate}
                    columnBorders={columnBorders}
                  >
                    <>
                      {(columns?.length >= 1 && !noHeader) && headerRowEl}
                      {groupingRowEls}
                    </>
                  </TableStyle>
                </AccordionPanel>
              </Accordion>
            </Spacing>
          ))}
        </>
      );
    }

    return (
      <TableStyle
        borderCollapseSeparate={borderCollapseSeparate}
        columnBorders={columnBorders}
      >
        {(columns?.length >= 1 && !noHeader) && headerRowEl}
        {rowEls}
      </TableStyle>
    );
  }, [
    borderCollapseSeparate,
    columnBorders,
    columns?.length,
    grouping,
    headerRowEl,
    noHeader,
    rowEls,
  ]);

  return (
    <div style={{ position: 'relative' }}>
      {tableEl}

      {hasRightClickMenu && coordinates && rightClickMenu}
    </div>
  );
}

export default React.forwardRef(Table);
