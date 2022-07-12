import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

export const GraphContainerStyle = styled.div`
  display: flex;
  flex: 1;
  overflow: auto;
  padding: ${UNIT}px;
  padding-bottom: ${UNIT * 3}px;
  width: 100%;

  ${ScrollbarStyledCss}
`;

export const NodeStyle = styled.div<{
  backgroundColor?: string;
  disabled: boolean;
  selected: boolean;
}>`
  border: 2px solid transparent;
  border-radius: ${BORDER_RADIUS_SMALL}px;
  min-width: fit-content;

  ${props => props.selected && `
    border-color: ${(props.theme.content || dark.content).active};
  `}

  ${props => props.backgroundColor && `
    background-color: ${props.backgroundColor};
  `}

  ${props => props.disabled && `
    opacity: 0.5;

    &:hover {
      cursor: not-allowed;
    }
  `}
`;
