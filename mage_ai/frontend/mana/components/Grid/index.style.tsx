import styled, { css } from 'styled-components';

import borders from '../../styles/borders';

export function isNumeric(str) {
  if (typeof str === 'undefined' || str === null) {
    return false;
  }

  return !isNaN(str);
}

export function range(numberOfItems) {
  if (isNumeric(numberOfItems) && numberOfItems >= 1) {
    return Array(numberOfItems).fill(0);
  }
  return [];
}

export type SharedStyledProps = {
  compact?: boolean;
  height?: 'auto' | 'inherit' | string;
  overflowVisible?: boolean;
  pad?: boolean;
  row?: number;
  section?: boolean;
  style?: React.CSSProperties;
  width?: 'auto' | 'inherit' | string;
};

export type GridStyledProps = {
  alignContent?: 'center' | 'start' | 'end' | 'stretch';
  alignItems?: 'center' | 'start' | 'end' | 'stretch';
  autoColumns?: string;
  autoFlow?: 'row' | 'column' | 'row dense' | 'column dense';
  autoRows?: string;
  columnGap?: number;
  justifyContent?:
    | 'center'
    | 'start'
    | 'end'
    | 'stretch'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';
  justifyItems?: 'center' | 'start' | 'end' | 'stretch';
  pad?: boolean;
  rowGap?: number;
  section?: boolean;
  templateColumns?: 'min-content' | 'max-content' | 'auto' | string;
  templateRows?: 'min-content' | 'max-content' | 'auto' | string;
  uuid?: string;
} & SharedStyledProps;

export const shared = css<SharedStyledProps>`
  display: grid;
  min-height: 0;
  min-width: 0;

  ${({ overflowVisible }) =>
    overflowVisible &&
    `
      overflow: visible;
    `}
  ${({ overflowVisible }) =>
    !overflowVisible &&
    `
        overflow: hidden;
      `}
  ${({ section }) => section && borders}
  ${({ compact, pad, section, theme }) =>
    !section &&
    `
    padding: ${pad ? theme.grid.gutter.width[compact ? 'sm' : 'base'] : 0}px;
  `}

  ${buildGridTemplateColumns().join('\n')}
  ${buildRowColumnStyles().join('\n')}

  .grid-cell {
    display: grid;
    min-height: 0;
    min-width: 0;
  }

  ${({ height }) =>
    typeof height !== 'undefined' &&
    `
    height: ${height};
  `}

  ${({ width }) =>
    typeof width !== 'undefined' &&
    `
    width: ${width};
  `}

  ${({ row }) =>
    typeof row !== 'undefined' &&
    `
    grid-row: ${row};
  `}
`;

function buildGridTemplateColumns(): string[] {
  const arr = [];

  range(12).forEach((_, idxRow: number) => {
    arr.push(`
      .grid-template-columns-${idxRow + 1} {
        grid-template-columns: repeat(${idxRow + 1}, minmax(0px, 1fr));
      }
    `);
  });

  return arr;
}

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
  ${shared}

  ${({ autoColumns }) =>
    typeof autoColumns !== 'undefined' &&
    `
    grid-auto-columns: ${autoColumns};
  `}

  ${({ autoRows }) =>
    typeof autoRows !== 'undefined' &&
    `
    grid-auto-rows: ${autoRows};
  `}

  ${({ autoFlow }) =>
    typeof autoFlow !== 'undefined' &&
    `
    grid-auto-flow: ${autoFlow};
  `}

  ${({ templateColumns }) =>
    typeof templateColumns !== 'undefined' &&
    `
    grid-template-columns: ${templateColumns};
  `}

  ${({ templateRows }) => `
    grid-template-rows: ${typeof templateRows !== 'undefined' ? templateRows : 'inherit'};
  `}

  ${({ alignItems }) =>
    typeof alignItems !== 'undefined' &&
    `
    align-items: ${alignItems};
  `}

  ${({ alignContent }) =>
    typeof alignContent !== 'undefined' &&
    `
    align-content: ${alignContent};
  `}

  ${({ justifyItems }) =>
    typeof justifyItems !== 'undefined' &&
    `
    justify-items: ${justifyItems};
  `}

  ${({ justifyContent }) =>
    typeof justifyContent !== 'undefined' &&
    `
    justify-content: ${justifyContent};
  `}

  ${({ columnGap, compact, rowGap, theme }) => `
    column-gap: ${typeof columnGap === 'undefined' ? theme.grid.gutter.width[compact ? 'sm' : 'base'] : columnGap}px;
    row-gap: ${typeof rowGap === 'undefined' ? theme.grid.gutter.width[compact ? 'sm' : 'base'] : rowGap}px;
  `}
`;

const stylesUUID = css<GridStyledProps>`
  &.${({ uuid }) => uuid} {
    ${styles}
  }
`;

export const GridStyled = styled.div<GridStyledProps>`
  ${({ uuid }) => (uuid ? stylesUUID : styles)}
`;
