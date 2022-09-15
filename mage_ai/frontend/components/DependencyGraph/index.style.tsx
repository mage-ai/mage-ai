import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

export const GraphContainerStyle = styled.div<{
  height?: number;
}>`
  div:only-child {
    ${ScrollbarStyledCss}
  }

  ${props => props.height && `
    height: ${props.height}px;
  `}
`;

export const NodeStyle = styled.div<{
  backgroundColor?: string;
  disabled: boolean;
  isCancelled: boolean;
  selected: boolean;
}>`
  border-radius: ${BORDER_RADIUS_SMALL}px;
  border: 1px solid transparent;
  min-width: fit-content;

  ${props => props.selected && `
    border-color: ${(props.theme.content || dark.content).active};
  `}

  ${props => props.backgroundColor && `
    background-color: ${props.backgroundColor};
  `}

  ${props => (props.isCancelled || props.disabled) && `
    opacity: 0.5;
  `}

  ${props => props.disabled && `
    &:hover {
      cursor: not-allowed;
    }
  `}
`;

export const RuntimeStyle = styled.div<{
  backgroundColor?:string;
}>`
  margin-right: ${2 * UNIT}px;
  padding: 12px 4px;

  height: 100%;
  width: 50px;

  background: rgba(0, 0, 0, 0.2);
  background-blend-mode: soft-light;
`
