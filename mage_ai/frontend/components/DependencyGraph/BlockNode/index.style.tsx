import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const ICON_SIZE = UNIT * 3;

export const NodeStyle = styled.div<{
  borderColor?: string;
  disabled?: boolean;
  height?: number;
  isCancelled: boolean;
  isConditionFailed: boolean;
  selected?: boolean;
}>`
  border-radius: ${BORDER_RADIUS}px;
  border: 1px solid transparent;
  min-width: fit-content;
  overflow: hidden;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}

  ${props => props.borderColor && `
    border-color: ${props.borderColor};
  `}

  ${props => props.selected && `
    border-color: ${(props.theme.content || dark.content).active};
  `}

  ${props => (props.isCancelled || props.disabled) && `
    // opacity doesn’t work on Safari
    border-color: ${(props.theme.content || dark.content).muted};
    border-style: dotted;
    cursor: not-allowed;
    opacity: 0.5;
  `}

  ${props => props.isConditionFailed && `
    background-color: ${(props.theme.content || dark.content).disabled};
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

export const StatusStyle = styled.div`
  height: ${UNIT * 2}px;
  width: ${UNIT * 2}px;
`;

export const IconStyle = styled.div<{
  backgroundColor?: string;
  borderColor?: string;
}>`
  align-items: center;
  border-radius: ${BORDER_RADIUS_SMALL}px;
  border: 2px solid transparent;
  display: flex;
  height: ${UNIT * 5}px;
  justify-content: center;
  width: ${UNIT * 5}px;

  ${props => props.backgroundColor && `
    background-color: ${props.backgroundColor};
    border-color: ${props.backgroundColor};
  `}

  ${props => props.borderColor && `
    border-color: ${props.borderColor};
  `}
`;

export const HeaderStyle = styled.div`
  padding: ${UNIT * 1}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).dashboard};
  `}
`;

export const BodyStyle = styled.div`
  padding-left: ${UNIT * 1}px;
  padding-right: ${UNIT * 1}px;
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
