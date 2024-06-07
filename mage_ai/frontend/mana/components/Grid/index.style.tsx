import styled from 'styled-components';

import { gutterWidth } from '@mana/themes/grid';
import { range } from '@utils/array';

export type GridStyledProps = {
  contained?: boolean;
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

export const GridStyled = styled.div<GridStyledProps>`
  ${({ contained, uuid }) => `
    &.${uuid} {
      column-gap: ${gutterWidth}px;
      display: grid;
      row-gap: ${gutterWidth}px;

      ${buildRowColumnStyles().join('\n')}

      padding: ${contained ? 0 : gutterWidth}px;
    }
  `}
`;
