import styled from 'styled-components';

import { GRID_ROW_COL_CLASS } from '../Col';

export const RowStyled = styled.div<{
  horizontalGutter?: number;
  verticalGutter?: number;
}>`
  ${({ horizontalGutter }) =>
    horizontalGutter &&
    `
    margin-left: -${horizontalGutter}px;
    margin-right: -${horizontalGutter}px;
  `}

  ${({ verticalGutter }) =>
    verticalGutter &&
    `
    margin-bottom: -${verticalGutter}px;
    margin-top: -${verticalGutter}px;
  `}

  ${({ horizontalGutter }) =>
    horizontalGutter &&
    `
    .${GRID_ROW_COL_CLASS} {
      padding-left: ${horizontalGutter}px !important;
      padding-right: ${horizontalGutter}px !important;
    }
  `}

  ${({ verticalGutter }) =>
    verticalGutter &&
    `
    .${GRID_ROW_COL_CLASS} {
      padding-bottom: ${verticalGutter}px;
      padding-top: ${verticalGutter}px;
    }
  `}
`;
