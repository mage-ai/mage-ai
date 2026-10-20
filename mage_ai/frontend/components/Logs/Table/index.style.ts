import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

export const TableContainer = styled.div`
  .table_row > div {
    margin: ${UNIT * 0.5}px ${UNIT}px;
  }

  div {
    ${ScrollbarStyledCss}
  }
`;

export const TableHeadStyle = styled.div`
  display: flex;
  align-items: center;
  overflow: hidden;

  ${props => `
    border-bottom: 1px solid ${(props.theme || dark).borders.medium2};
  `}
`;

export const TableRowStyle = styled.div<{
  selected?: boolean;
}>`
  display: flex;
  align-items: center;

  ${props => `
    border-bottom: 1px solid ${(props.theme || dark).borders.light};

    &:hover {
      cursor: pointer;
    }
  `}
  
  ${props => !props.selected && `
    &:hover {
      background: ${(props.theme.interactive || dark.interactive).rowHoverBackground};
      cursor: pointer;
    }
  `}

  ${props => props.selected && `
    background-color: ${(props.theme.interactive || dark.interactive).activeBorder};
  `}
`;
