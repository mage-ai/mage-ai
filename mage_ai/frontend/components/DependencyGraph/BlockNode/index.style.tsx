import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const ICON_SIZE = UNIT * 3;
export const BORDER_WIDTH = 1;

export const NodeContainerStyle = styled.div<{
  active?: boolean;
  borderColor?: string;
  disabled?: boolean;
  height?: number;
  isCancelled: boolean;
  noBackground?: boolean;
}>`
  border-radius: ${BORDER_RADIUS}px;
  min-width: fit-content;
  padding: ${BORDER_WIDTH}px;

  ${props => !props.active && props.borderColor && `
    border: ${BORDER_WIDTH}px solid transparent;
  `}

  ${props => !props.active && (props.isCancelled || props.disabled) && `
    // opacity doesn’t work on Safari
    border-color: ${(props.theme.content || dark.content).muted};
    border-style: dotted;
    cursor: not-allowed;
    opacity: 0.5;
  `}

  ${props => props.active && props.borderColor && `
    animation: border-dance .5s infinite linear;
    background: linear-gradient(90deg, ${props.borderColor} 50%, transparent 50%),
      linear-gradient(90deg, ${props.borderColor} 50%, transparent 50%),
      linear-gradient(0deg, ${props.borderColor} 50%, transparent 50%),
      linear-gradient(0deg, ${props.borderColor} 50%, transparent 50%);
    background-repeat: repeat-x, repeat-x, repeat-y, repeat-y;

    @keyframes border-dance {
      0% {
        background-position: left top,
          right bottom,
          left bottom,
          right top;
      }
      100% {
        background-position: left 15px top,
          right 15px bottom,
          left bottom 15px,
          right top 15px;
      }
    }
  `}

  ${props => props.active && props.borderColor && !props.noBackground && `
    background-size: 15px 4px, 15px 4px, 4px 15px, 4px 15px;
  `}

  ${props => props.active && props.borderColor && props.noBackground && `
    background-size: 15px 1.5px, 15px 1.5px, 1.5px 15px, 1.5px 15px;
  `}

  ${props => props.height && `
    height: ${props.height}px;
  `}
`;

export const NodeStyle = styled.div<{
  disabled?: boolean;
  height?: number;
  isConditionFailed: boolean;
  noBackground?: boolean;
}>`
  border-radius: ${BORDER_RADIUS}px;
  min-width: fit-content;
  overflow: hidden;

  ${props => !props.noBackground && `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
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
