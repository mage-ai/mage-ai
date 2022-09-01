import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { UNIT } from '@oracle/styles/units/spacing';

export const TableStyle = styled.table`
  contain: size;
  width: 100%;
`;

export const TableRowStyle = styled.tr<{
  noHover?: boolean;
}>`
  ${props => !props.noHover && `
    &:hover {
      background: ${(props.theme.interactive || dark.interactive).rowHoverBackground};
      cursor: pointer;
    }
  `}
`;


const SHARED_STYLES = css<{
  maxWidth?: string;
}>`
  padding: ${UNIT / 2}px ${UNIT}px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${props => `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).light};
  `}

  ${props => props.maxWidth && `
    max-width: ${props.maxWidth};
  `}
`;

export const TableHeadStyle = styled.th`
  ${SHARED_STYLES}
`;

export const TableDataStyle = styled.td`
  ${SHARED_STYLES}
`;
