import React from 'react';
import styled from 'styled-components';

import FlexContainer from '../FlexContainer';
import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export type FlexTableProps = {
  borderRadius?: boolean;
  columnFlex: number[];
  noBorder?: boolean;
  rows: any[][];
  paddingHorizontal?: number;
  paddingVertical?: number;
};

const TableStyle = styled.div<any>`
  display: flex;
  flex-direction: column;
`;

const CellStyle = styled.div<any>`
  ${props => props.flex && `
    flex: ${props.flex};
  `}
  
  display: flex;
  align-items: center;

  padding: 0 ${2 * UNIT}px;

  ${props => typeof props.paddingHorizontal !== undefined && `
    padding-left: ${props.paddingHorizontal}px;
    padding-right: ${props.paddingHorizontal}px;
  `}

  ${props => typeof props.paddingVertical !== undefined  && `
    padding-top: ${props.paddingVertical}px;
    padding-bottom: ${props.paddingVertical}px;
  `}

  ${props => !props.noBorder && `
    border-left: 1px solid ${(props.theme.borders || dark.borders).medium};
    border-top: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}

  ${props => !props.noBorder && props.lastCol && `
    border-right: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}

  ${props => !props.noBorder && props.lastRow && `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}

  ${props => !props.noBorder && props.borderRadius && props.firstCol && props.firstRow && `
    border-top-left-radius: ${BORDER_RADIUS}px;
  `}

  ${props => !props.noBorder && props.borderRadius && props.lastCol && props.firstRow && `
    border-top-right-radius: ${BORDER_RADIUS}px;
  `}

  ${props => !props.noBorder && props.borderRadius && props.firstCol && props.lastRow && `
    border-bottom-left-radius: ${BORDER_RADIUS}px;
  `}

  ${props => !props.noBorder && props.borderRadius && props.lastCol && props.lastRow && `
    border-bottom-right-radius: ${BORDER_RADIUS}px;
  `}
`;

function FlexTable({
  columnFlex,
  rows,
  ...props
}: FlexTableProps) {
  return (
    <TableStyle>
      {rows.map((row, rowIndex) => (
        <FlexContainer>
          {row.map((cell, colIndex) => (
            <CellStyle
              firstCol={colIndex === 0}
              firstRow={rowIndex === 0}
              flex={columnFlex[colIndex]}
              lastCol={colIndex === row.length - 1}
              lastRow={rowIndex === rows.length - 1}
              {...props}
            >
              {cell}
            </CellStyle>
          ))}
        </FlexContainer>
      ))}
    </TableStyle>
  )
}

export default FlexTable;
