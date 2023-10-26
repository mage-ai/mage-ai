import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL, BORDER_RADIUS_XLARGE } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const ICON_SIZE = UNIT * 3;
export const BORDER_WIDTH = 2;

export const NodeContainerStyle = styled.div<{
  active?: boolean;
  activeSlow?: boolean;
  backgroundGradient?: string;
  borderColorBottom?: string;
  borderColorLeft?: string;
  borderColorRight?: string;
  borderColorTop?: string;
  borderDeemphasized?: boolean;
  borderRadiusLarge?: boolean;
  disabled?: boolean;
  height?: number;
  isCancelled: boolean;
  isDragging?: boolean;
  noBackground?: boolean;
  opacity?: number;
  selected?: boolean;
}>`
  min-width: fit-content;

  ${props => !props.isDragging && `
    &:hover {
      cursor: pointer;
    }
  `}

  ${props => props.isDragging && `
    cursor: grab;
  `}

  ${props => !props.active && (props.isCancelled || props.disabled) && `
    // opacity doesn’t work on Safari
    border: ${BORDER_WIDTH}px dotted ${(props.theme.content || dark.content).muted};
    cursor: not-allowed;
    opacity: 0.5;
  `}

  ${props => (!props.selected || !props.backgroundGradient) && !props.active && props.borderColorBottom && `
    border-bottom-color: ${props.borderColorBottom};
    border-width: ${BORDER_WIDTH}px;
  `}

  ${props => (!props.selected || !props.backgroundGradient) && !props.active && props.borderColorLeft && `
    border-left-color: ${props.borderColorLeft};
    border-width: ${BORDER_WIDTH}px;
  `}

  ${props => (!props.selected || !props.backgroundGradient) && !props.active && props.borderColorRight && `
    border-right-color: ${props.borderColorRight};
    border-width: ${BORDER_WIDTH}px;
  `}

  ${props => (!props.selected || !props.backgroundGradient) && !props.active && props.borderColorTop && `
    border-top-color: ${props.borderColorTop};
    border-width: ${BORDER_WIDTH}px;
  `}

  ${props => props.selected && !props.active && props.backgroundGradient && `
    background: ${props.backgroundGradient};
    padding: ${BORDER_WIDTH}px;
  `}

  ${props => !props.borderDeemphasized && `
    border-style: solid;
  `}

  ${props => props.borderDeemphasized && `
    border-style: double;
  `}

  ${props => !props.borderRadiusLarge && `
    border-radius: ${BORDER_RADIUS}px;
  `}

  ${props => props.borderRadiusLarge && `
    border-radius: ${BORDER_RADIUS_XLARGE}px;
  `}

  ${props => props.active && (props.borderColorBottom || props.borderColorLeft || props.borderColorRight || props.borderColorTop) && `
    animation: border-dance ${props?.activeSlow ? '2s' : '.5s'} infinite linear;
    background: linear-gradient(90deg, ${props.borderColorTop || props.borderColorBottom || props.borderColorLeft || props.borderColorRight} 50%, transparent 50%),
      linear-gradient(90deg, ${props.borderColorRight || props.borderColorTop || props.borderColorBottom || props.borderColorLeft} 50%, transparent 50%),
      linear-gradient(0deg, ${props.borderColorLeft || props.borderColorRight || props.borderColorTop || props.borderColorBottom} 50%, transparent 50%),
      linear-gradient(0deg, ${props.borderColorBottom || props.borderColorLeft || props.borderColorRight || props.borderColorTop} 50%, transparent 50%);
    background-repeat: repeat-x, repeat-x, repeat-y, repeat-y;
    padding: ${BORDER_WIDTH}px;

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

  ${props => props.active && (props.borderColorBottom || props.borderColorLeft || props.borderColorRight || props.borderColorTop) && !props.noBackground && `
    background-size: 15px 4px, 15px 4px, 4px 15px, 4px 15px;
  `}

  ${props => props.active && (props.borderColorBottom || props.borderColorLeft || props.borderColorRight || props.borderColorTop) && props.noBackground && `
    background-size: 15px 1.5px, 15px 1.5px, 1.5px 15px, 1.5px 15px;
  `}

  ${props => props.height && `
    height: ${props.height}px;
  `}

  ${props => props.opacity && `
    opacity: ${props.opacity};
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
