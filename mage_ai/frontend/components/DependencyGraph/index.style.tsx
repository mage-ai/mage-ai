import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

export const GraphContainerStyle = styled.div<{
  height?: number;
}>`
  div {
    ${ScrollbarStyledCss}
  }

  ${props => props.height && `
    height: ${props.height}px;
  `}
`;

export const NodeStyle = styled.div<{
  backgroundColor?: string;
  disabled: boolean;
  height?: number;
  isCancelled: boolean;
  isConditionFailed: boolean;
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
    // opacity doesn’t work on Safari
    border-color: ${(props.theme.content || dark.content).active};
    border-style: dashed;
    cursor: not-allowed;
  `}

  ${props => props.isConditionFailed && `
    background-color: ${(props.theme.content || dark.content).disabled};
    cursor: not-allowed;
  `}

  ${props => props.disabled && `
    &:hover {
      cursor: not-allowed;
    }
  `}

  ${props => props.height && `
    height: ${props.height}px;
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
`;
