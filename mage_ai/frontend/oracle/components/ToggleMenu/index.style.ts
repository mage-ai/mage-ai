import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import {
  BORDER_RADIUS,
  BORDER_STYLE,
  BORDER_WIDTH,
  BORDER_WIDTH_THICK,
} from '@oracle/styles/units/borders';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

const CONTAINER_MIN_WIDTH = UNIT * 74;
const MAIN_HEIGHT = UNIT * 48;

export const ContainerStyle = styled.div<{
  compact?: boolean;
  display?: boolean;
  left?: number;
  top?: number;
}>`
  position: absolute;
  border-radius: ${BORDER_RADIUS}px;
  overflow: hidden;
  width: ${CONTAINER_MIN_WIDTH}px;
  display: none;

  ${props => `
    background-color: ${(props.theme || dark).background.panel};
    border: ${BORDER_WIDTH_THICK}px ${BORDER_STYLE} ${(props.theme || dark).interactive.defaultBackground};
    box-shadow: ${(props.theme.shadow || dark.shadow).window};
  `}

  ${props => props.display && `
    display: block;
  `}

  ${props => props.compact && `
    width: ${CONTAINER_MIN_WIDTH * 0.75}px;
  `}

  ${props => typeof props.left !== 'undefined' && `
    left: ${props.left}px;
  `}

  ${props => typeof props.top !== 'undefined' && `
    top: ${props.top}px;
  `}
`;

export const MainStyle = styled.div<{
  compact?: boolean;
}>`
  display: flex;
  border-radius: ${BORDER_RADIUS}px;
  overflow: hidden;
  height: ${MAIN_HEIGHT}px;

  ${props => `
    background-color: ${(props.theme || dark).background.content};
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).interactive.defaultBackground};
  `}

  ${props => props.compact && `
    height: ${MAIN_HEIGHT / 2}px;
  `}
`;

export const BeforeStyle = styled.aside`
  width: 100%;
  overflow: auto;
  ${ScrollbarStyledCss}

  ${props => `
    border-right: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).background.panel};
  `}
`;

export const ContentStyle = styled.div`
  width: 100%;
  overflow: auto;
  ${ScrollbarStyledCss}
`;

const SHARED_STYLES = css`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${UNIT}px ${UNIT * 2}px;
`;

export const OptionStyle = styled.div<{
  highlighted?: boolean;
}>`
  ${SHARED_STYLES}
  padding-top: ${UNIT * 1.5}px;
  padding-bottom: ${UNIT * 1.5}px;

  &:hover {
    cursor: pointer;

    ${props => `
      background-color: ${(props.theme || dark).monotone.black};
    `}
  }

  ${props => props.highlighted && `
    background-color: ${(props.theme || dark).monotone.black};
  `}
`;

export const ToggleValueStyle = styled.div`
  ${SHARED_STYLES}

  ${props => `
    border-bottom: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).borders.medium2};
  `}
`;
