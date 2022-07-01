import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import {
  ScrollbarStyledCss,
} from '@oracle/styles/scrollbars';
import { hideScrollBar } from '@oracle/styles/mixins';

export const AFTER_DEFAULT_WIDTH = UNIT * 50;
export const AFTER_MIN_WIDTH = PADDING_UNITS * 3 * UNIT;
export const BEFORE_MIN_WIDTH = AFTER_MIN_WIDTH;
export const BEFORE_DEFAULT_WIDTH = UNIT * 35;
export const DRAGGABLE_WIDTH = UNIT * 0.5;
export const MAIN_MIN_WIDTH = UNIT * 13;

const ASIDE_HEADER_HEIGHT = PADDING_UNITS * 3 * UNIT;

export const HeaderStyle = styled.div<{
  beforeVisible?: boolean;
}>`
  position: fixed;
  z-index: 2;

  ${props => `
    border-bottom: 1px solid ${(props.theme.monotone || dark.monotone).grey200};
  `}

  ${props => !props.beforeVisible && `
    width: 100%;
  `}

  ${props => props.beforeVisible && `
    left: ${BEFORE_DEFAULT_WIDTH}px;
    width: calc(100% - ${BEFORE_DEFAULT_WIDTH}px);
  `}
`;

export const TabStyle = styled.div<{
  first: boolean;
  selected: boolean;
}>`
  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;
  padding: ${UNIT * 1}px ${UNIT * 2}px;
  position: relative;
  top: 1px;

  ${props => `
    border-left: 1px solid ${(props.theme.monotone || dark.monotone).grey200};
    border-right: 1px solid ${(props.theme.monotone || dark.monotone).grey200};
    border-top: 1px solid ${(props.theme.monotone || dark.monotone).grey200};
  `}

  ${props => !props.first && `
    margin-left: ${UNIT * 1}px;
  `}

  ${props => props.selected && `
    border-bottom: 1px solid ${(props.theme.monotone || dark.monotone).white};
  `}
`;

const ASIDE_STYLE = css`
  height: calc(100% - ${ASIDE_HEADER_HEIGHT}px);
  position: fixed;
  top: ${ASIDE_HEADER_HEIGHT}px;
  z-index: 1;

  ${props => `
    background-color: ${(props.theme.background || dark.background).sidePanel};
  `}
`;

const ASIDE_INNER_STYLE = css`
  ${ScrollbarStyledCss}

  height: 100%;
  overflow: auto;
  position: relative;
  z-index: 2;
`;

const ASIDE_DRAGGABLE_STYLE = css<{
  active?: boolean;
  disabled?: boolean;
}>`
  height: calc(100% + ${ASIDE_HEADER_HEIGHT}px);
  position: absolute;
  top: -${ASIDE_HEADER_HEIGHT}px;
  width: ${DRAGGABLE_WIDTH}px;
  z-index: 6;

  &:hover {
    ${props => !props.disabled && `
      border-color: ${(props.theme.text || dark.text).fileBrowser} !important;
    `}
  }

  ${props => !props.disabled && `
    cursor: col-resize;
  `}

  ${props => props.active && !props.disabled && `
    border-color: ${(props.theme.text || dark.text).fileBrowser} !important;
  `}
`;

export const AsideHeaderStyle = styled.div<{
  visible: boolean;
}>`
  border-bottom: 1px solid transparent;
  height: ${ASIDE_HEADER_HEIGHT}px;
  position: fixed;
  top: 0;
  z-index: 4;
  overflow-x: auto;

  ${hideScrollBar()}

  ${props => `
    background-color: ${(props.theme.background || dark.background).sidePanel};
  `}

  ${props => !props.visible && `
    border-color: ${(props.theme.borders || dark.borders).medium} !important;
  `}
`;

export const BeforeStyle = styled.aside`
  ${ASIDE_STYLE}

  left: 0;
`;

export const BeforeInnerStyle = styled.div`
  ${ASIDE_INNER_STYLE}
`;

export const AfterStyle = styled.aside`
  ${ASIDE_STYLE}

  right: 0;
`;

export const AfterInnerStyle = styled.div`
  ${ASIDE_INNER_STYLE}
`;

export const DraggableStyle = styled.div<{
  active?: boolean;
  disabled?: boolean;
  left?: number;
  right?: number;
}>`
  ${ASIDE_DRAGGABLE_STYLE}

  ${props => typeof props.left !== 'undefined' && `
    border-left: 1px solid transparent;
    left: ${props.left}px;
  `}

  ${props => typeof props.right !== 'undefined' && `
    border-right: 1px solid transparent;
    right: ${props.right}px;
  `}
`;

export const MainContentStyle = styled.div<{
  beforeVisible?: boolean;
  headerOffset?: number;
}>`
  height: 100%;
  position: fixed;
  z-index: 1;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeArea};
  `}
`;

export const MainContentInnerStyle = styled.div`
  ${ScrollbarStyledCss}

  height: 100%;
  overflow: auto;
`;
