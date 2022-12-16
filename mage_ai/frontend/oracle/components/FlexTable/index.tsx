import React, { useCallback } from 'react';
import NextLink from 'next/link';
import styled, { css } from 'styled-components';

import Link from '@oracle/elements/Link';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export type FlexTableProps = {
  buildLinkProps?: (rowIndex: number) => {
    as: string;
    href: string;
  };
  borderRadius?: boolean;
  columnFlex: number[];
  columnHeaders?: any[];
  noBorder?: boolean;
  onClickRow?: (index: number) => void;
  rows: any[][];
  paddingHorizontal?: number;
  paddingVertical?: number;
};

const TableStyle = styled.div<any>`
  display: flex;
  flex-direction: column;
`;

const SHARED_STYLES = css`
  align-items: center;
  display: flex;
  flex-direction: row;

  ${props => `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).light};
  `}
`;

const HeaderStyle = styled.div`
  ${SHARED_STYLES}
`;

const RowStyle = styled.div<{
  noHover?: boolean;
}>`
  ${SHARED_STYLES}

  ${transition()}

  flex: 1;

  ${props => !props.noHover && `
    &:hover {
      background: ${(props.theme.interactive || dark.interactive).rowHoverBackground};
      cursor: pointer;
    }
  `}
`;

const CellStyle = styled.div<any>`
  align-items: center;
  display: flex;
  padding: ${2 * UNIT}px;

  ${props => props.flex && `
    flex: ${props.flex};
  `}
`;

function FlexTable({
  buildLinkProps,
  columnFlex,
  columnHeaders,
  onClickRow,
  rows,
  ...props
}: FlexTableProps) {

  let updatedRows = rows;
  if (columnHeaders) {
    updatedRows = [columnHeaders, ...rows]
  }

  const Column = useCallback((cell, rowIndex, colIndex) => (
    <CellStyle
      flex={columnFlex[colIndex]}
      key={`row-${rowIndex}-col-${colIndex}`}
      {...props}
    >
      {cell}
    </CellStyle>
  ), [
    columnFlex,
    props,
  ]);
  const Row = useCallback((row, rowIndex: number) => {
    const cellEls = row.map((cell, colIndex) => Column(cell, rowIndex, colIndex));

    if (buildLinkProps) {
      const linkProps = buildLinkProps(rowIndex)
      return (
        <NextLink
          {...linkProps}
          key={`row-${rowIndex}`}
          passHref
        >
          <Link
            fullWidth
            noHoverUnderline
            noOutline
            verticalAlignContent
          >
            <RowStyle>
              {cellEls}
            </RowStyle>
          </Link>
        </NextLink>
      );
    }

    return (
      <RowStyle
        noHover={!onClickRow}
        onClick={() => onClickRow?.(rowIndex)}
        key={`row-${rowIndex}`}
      >
        {cellEls}
      </RowStyle>
    );
  }, [
    buildLinkProps,
    onClickRow,
  ]);

  return (
    <TableStyle>
      {columnHeaders?.length >= 1 && (
        <HeaderStyle>
          {columnHeaders.map((cell, colIndex) => Column(cell, -1, colIndex))}
        </HeaderStyle>
      )}

      {rows.map((row, rowIndex) => Row(row, rowIndex))}
    </TableStyle>
  );
}

export default FlexTable;
