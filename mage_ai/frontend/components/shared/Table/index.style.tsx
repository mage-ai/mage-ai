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
  alignTop?: boolean;
  compact?: boolean;
  maxWidth?: string;
  noBorder?: boolean;
  selected?: boolean;
}>`
  text-overflow: ellipsis;
  white-space: nowrap;

  ${props => !props.alignTop && `
    vertical-align: middle;
  `}

  ${props => props.alignTop && `
    vertical-align: top;
  `}

  ${props => !props.noBorder && `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).light};
  `}

  ${props => props.compact && `
    padding: ${UNIT / 2}px ${UNIT}px;
  `}

  ${props => !props.compact && `
    padding: ${UNIT}px ${2 * UNIT}px;
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

  ${props => props.selected && `
    background-color: ${(props.theme.interactive || dark.interactive).activeBorder};
  `}
`;
