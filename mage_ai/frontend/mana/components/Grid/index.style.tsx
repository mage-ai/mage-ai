import styled, { css } from 'styled-components';

import { gutterWidth as gutterWidthBase } from '@mana/themes/grid';
import { range } from '@utils/array';

export type GridStyledProps = {
  alignContent?: 'center' | 'start' | 'end' | 'stretch';
  alignItems?: 'center' | 'start' | 'end' | 'stretch';
  autoColumns?: string;
  autoFlow?: 'row' | 'column' | 'row dense' | 'column dense';
  autoRows?: string;
  columnGap?: number;
  height?: 'auto' | 'inherit' | string;
  justifyContent?: 'center' | 'start' | 'end' | 'stretch';
  justifyItems?: 'center' | 'start' | 'end' | 'stretch';
  pad?: boolean;
  rowGap?: number;
  templateColumns?: 'min-content' | 'max-content' | 'auto' | string;
  templateRows?: 'min-content' | 'max-content' | 'auto' | string;
  uuid?: string;
};

function buildRowColumnStyles(): string[] {
  const arr = [];

  range(12).forEach((_, idxRow: number) => {
    arr.push(`
      .grid-row-${idxRow} {
        grid-row: ${idxRow + 1};
      }
    `);
  });

  range(12).forEach((_, idxCol: number) => {
    arr.push(`
      .grid-col-${idxCol} {
        grid-column: ${idxCol + 1};
      }
    `);
  });

  return arr;
}

const styles = css<GridStyledProps>`
  ${({
    alignContent,
    alignItems,
    autoColumns,
    autoFlow,
    autoRows,
    columnGap,
    height,
    justifyContent,
    justifyItems,
    pad,
    rowGap,
    templateColumns,
    templateRows,
  }) => `
    display: grid;
    grid-template-columns: ${templateColumns || 'auto'};
    grid-template-rows: ${templateRows || 'auto'};
    height: ${height || 'auto'};
    padding: ${pad ? gutterWidthBase : 0}px;

    column-gap: ${typeof columnGap === 'undefined' ? gutterWidthBase: columnGap}px;
    row-gap: ${typeof rowGap === 'undefined' ? gutterWidthBase: rowGap}px;

    align-items: ${alignItems ? alignItems : 'start'};
    align-content: ${alignContent ? alignContent : 'start'};
    justify-items: ${justifyItems ? justifyItems : 'start'};
    justify-content: ${justifyContent ? justifyContent : 'start'};

    ${false && buildRowColumnStyles().join('\n')}

    grid-auto-columns: ${autoColumns || 'inherit'};
    grid-auto-rows: ${autoRows || 'inherit'};
    grid-auto-flow: ${autoFlow || 'inherit'};

    .grid-cell {
      grid-column: span 1;
      grid-row: span 1;
    }
  `}
`;

export const GridStyled = styled.div<GridStyledProps>`
  ${({ uuid }) => uuid
    ? `
      &.${uuid} {
        ${styles}
      }
    `
    : styles}
`;
