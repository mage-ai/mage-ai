import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

export const DropdownStyle = styled.div<{
  topOffset?: number;
}>`
  ${ScrollbarStyledCss}

  border-radius: ${BORDER_RADIUS_SMALL}px;
  max-height: ${UNIT * 40}px;
  overflow: auto;
  position: absolute;
  width: 100%;
  z-index: 1;

  ${props => `
    background-color: ${(props.theme.background || dark.background).popup};
    box-shadow: ${(props.theme.shadow || dark.shadow).popup};
  `}

  ${props => props.topOffset && `
    top: ${props.topOffset - (UNIT * 0.5)}px;
  `}
`;

export const RowStyle = styled.div<{
  highlighted?: boolean;
}>`
  padding: ${UNIT * 0.5}px;
  position: relative;
  z-index: 2;

  &:hover {
    cursor: pointer;
  }

  ${props => props.highlighted && `
    background-color: ${(props.theme.interactive || dark.interactive).hoverBackground};
  `}
`;
