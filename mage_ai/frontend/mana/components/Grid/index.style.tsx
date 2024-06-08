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
  row?: number;
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
      .grid-row-start-${idxRow} {
        grid-row-start: ${idxRow + 1};
      }
      .grid-row-end-${idxRow} {
        grid-row-end: ${idxRow + 1};
      }
    `);
  });

  range(12).forEach((_, idxCol: number) => {
    arr.push(`
      .grid-col-${idxCol} {
        grid-column: ${idxCol + 1};
      }
      .grid-col-start-${idxCol} {
        grid-column-start: ${idxCol + 1};
      }
      .grid-col-end-${idxCol} {
        grid-column-end: ${idxCol + 1};
      }
    `);
  });

  return arr;
}

const styles = css<GridStyledProps>`
  ${({ height }) => typeof height !== 'undefined' && `
    height: ${height};
  `}

  ${({ row }) => typeof row !== 'undefined' && `
    grid-row: ${row};
  `}

  ${({ autoColumns }) => typeof autoColumns !== 'undefined' && `
    grid-auto-columns: ${autoColumns};
  `}

  ${({ autoRows }) => typeof autoRows !== 'undefined' && `
    grid-auto-rows: ${autoRows};
  `}

  ${({ autoFlow }) => typeof autoFlow !== 'undefined' && `
    grid-auto-flow: ${autoFlow};
  `}

  ${({ templateColumns }) => typeof templateColumns !== 'undefined' && `
    grid-template-columns: ${templateColumns};
  `}

  ${({ templateRows }) => typeof templateRows !== 'undefined' && `
    grid-template-rows: ${templateRows};
  `}

  ${({ alignItems }) => typeof alignItems !== 'undefined' && `
    align-items: ${alignItems};
  `}

  ${({ alignContent }) => typeof alignContent !== 'undefined' && `
    align-content: ${alignContent};
  `}

  ${({ justifyItems }) => typeof justifyItems !== 'undefined' && `
    justify-items: ${justifyItems};
  `}

  ${({ justifyContent }) => typeof justifyContent !== 'undefined' && `
    justify-content: ${justifyContent};
  `}

  ${({
    columnGap,
    pad,
    rowGap,
  }) => `
    display: grid;
    padding: ${pad ? gutterWidthBase : 0}px;

    column-gap: ${typeof columnGap === 'undefined' ? gutterWidthBase: columnGap}px;
    row-gap: ${typeof rowGap === 'undefined' ? gutterWidthBase: rowGap}px;


    ${buildRowColumnStyles().join('\n')}

    .grid-cell {
      display: grid;
    }
  `}
`;

const stylesUUID = css<GridStyledProps>`
  &.${({ uuid }) => uuid} {
    ${styles}
  }
`;

export const GridStyled = styled.div<GridStyledProps>`
  ${({ uuid }) => uuid ? stylesUUID : styles}
`;
