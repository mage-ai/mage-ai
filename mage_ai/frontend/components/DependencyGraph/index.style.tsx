import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

export const STROKE_WIDTH = 2;

export function inverseColorsMapping(themeContext: any = dark) {
  const mapping = {};
  [
    themeContext?.accent,
    themeContext?.content,
    themeContext?.monotone,
  ].forEach((colors) => {
    Object.entries(colors).forEach(([k, v]) => {
      // @ts-ignore
      mapping[v] = k;
    });
  });

  return mapping;
}

const colorStyles = Object.entries(inverseColorsMapping()).reduce((acc, [k, v]) => acc.concat(`
    .edge-rect-${v} {
      rect {
        fill: ${k};
      }
    }

    .edge-line-${v} {
      line {
        stroke: ${k};
      }
    }
  `), []);

export const GraphContainerStyle = styled.div<{
  height?: number;
}>`
  position: relative;
  
  div {
    ${ScrollbarStyledCss}
  }

  ${props => props.height && `
    height: ${props.height}px;
  `}

  .edge {
    &.activeSlow {
      animation: dashdraw 2s linear infinite;
      stroke-dasharray: 5;
      stroke-width: ${STROKE_WIDTH};
    }

    &.active {
      animation: dashdraw .5s linear infinite;
      stroke-dasharray: 5;
      stroke-width: ${STROKE_WIDTH};
    }

    &.inactive {
    }

    &.selected-twice {
      stroke-dasharray: 4 2 4 2 4 8;
      stroke-width: ${STROKE_WIDTH};
    }

    &.selected-twice.group {
      stroke-dasharray: 8 24;
      stroke-width: ${STROKE_WIDTH};
    }
  }

  @keyframes dashdraw {
    0% {
      stroke-dashoffset: 10;
    }
  }

  .edge-rect {
    rect {
      fill: none;
    }
  }

  .edge-line {
    line {
      stroke-width: ${UNIT / 4}px;
    }
  }

  .edge-line-remove {
    line {
      ${props => `
        stroke: ${(props.theme.accent || dark.accent).negative};
      `}
    }
  }

  ${colorStyles.join('\n')}
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
