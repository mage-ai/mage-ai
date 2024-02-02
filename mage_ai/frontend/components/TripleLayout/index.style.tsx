import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { HEADER_HEIGHT } from '@components/shared/Header/index.style';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { PlainScrollbarStyledCss, SCROLLBAR_WIDTH_SMALL, hideScrollBar } from '@oracle/styles/scrollbars';

export const AFTER_DEFAULT_WIDTH = UNIT * 64;
export const AFTER_MIN_WIDTH = UNIT * 30;
export const BEFORE_MIN_WIDTH = UNIT * 21.25;
export const BEFORE_DEFAULT_WIDTH = UNIT * 35;
export const DRAGGABLE_WIDTH = UNIT;
export const MAIN_MIN_WIDTH = UNIT * 13;

export const ASIDE_HEADER_HEIGHT = PADDING_UNITS * 3 * UNIT;
export const ASIDE_SUBHEADER_HEIGHT = 44;
export const ALL_HEADERS_HEIGHT = 2 * PADDING_UNITS * 3 * UNIT;

type ScrollbarTrackType = {
  noScrollbarTrackBackground?: boolean;
};

export const InlineContainerStyle = styled.div<{
  height?: number;
}>`
  position: relative;

  ${props => props.height && `
    height: ${props.height}px;
  `}

  ${props => !props.height && `
    height: inherit;
  `}
`;

export const HeaderStyle = styled.div<{
  beforeVisible?: boolean;
}>`
  position: fixed;
  z-index: 3;

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

export const NewHeaderStyle = styled.div<any>`
  height: ${HEADER_HEIGHT}px;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 4;
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

const ASIDE_STYLE = css<{
  autoLayout?: boolean;
  heightOffset?: number;
  inline?: boolean;
}>`
  z-index: 2;

  ${props => `
    height: calc(100% - ${typeof props.heightOffset === 'undefined' ? ALL_HEADERS_HEIGHT : props.heightOffset}px);
  `}

  ${props => props.inline && `
    position: absolute;
  `}

  ${props => !props.inline && `
    background-color: ${(props.theme.background || dark.background).panel};
    position: fixed;
    top: ${typeof props.heightOffset === 'undefined' ? ALL_HEADERS_HEIGHT : props.heightOffset}px;
  `}

  ${props => props.autoLayout && `
    display: flex;
    flex-direction: column;
    height: inherit;
    overflow: hidden;
  `}
`;

const ASIDE_INNER_STYLE = css<{
  heightOffset?: number;
  verticalOffset?: number;
}>`
  ${PlainScrollbarStyledCss}

  height: 100%;
  overflow: auto;
  position: relative;
  z-index: 2;

  ${props => typeof props.verticalOffset !== 'undefined' && props.verticalOffset !== null && `
    height: calc(100% - ${props.verticalOffset + (props.heightOffset || 0)}px);
    top: ${props.verticalOffset}px;
  `}
`;

const ASIDE_DRAGGABLE_STYLE = css<{
  active?: boolean;
  left?: number;
  disabled?: boolean;
  top?: number;
  topOffset?: number;
}>`
  position: absolute;
  width: ${DRAGGABLE_WIDTH}px;
  z-index: 6;

  &:hover {
    ${props => !props.disabled && `
      border-color: ${(props.theme.text || dark.text).fileBrowser} !important;
    `}
  }

  ${props => `
    height: calc(100% + ${props?.top || 0}px);
    top: ${-(props?.top || 0) + (props.topOffset || 0)}px;
  `}

  ${props => !props.disabled && `
    cursor: col-resize;
  `}

  ${props => props.active && !props.disabled && `
    border-color: ${(props.theme.text || dark.text).fileBrowser} !important;
  `}
`;

export const MainContainerHeaderStyle = styled.div`
  min-height: ${ASIDE_SUBHEADER_HEIGHT}px;
`;

export const AsideHeaderStyle = styled.div<{
  contained?: boolean;
  contrast?: boolean;
  inline?: boolean;
  top?: number;
  visible: boolean;
}>`
  align-items: center;
  border-bottom: 1px solid transparent;
  display: flex;
  max-height: ${1 + ASIDE_SUBHEADER_HEIGHT}px;
  min-height: ${1 + ASIDE_SUBHEADER_HEIGHT}px;
  z-index: 4;

  ${hideScrollBar()}

  ${props => !props.contrast && `
    background-color: ${(props.theme.background || dark.background).panel};
    top: ${props?.top || 0}px;
  `}

  ${props => !props.visible && `
    border-left: 1px solid transparent;
    border-right: 1px solid transparent;
  `}

  ${props => !props.contrast && `
    border-bottom-color: ${(props.theme.borders || dark.borders).medium} !important;
  `}

  ${props => props.contrast && `
    border-bottom-color: ${(props.theme.borders || dark.borders).light} !important;
  `}

  ${props => props.contained && `
    border-left-color: ${(props.theme.borders || dark.borders).medium} !important;
  `}

  ${props => !props.inline && `
    position: fixed;
  `}
`;

export const AsideHeaderInnerStyle = styled.div<{
  noPadding?: boolean;
}>`
  display: flex;
  flex: 1;
  overflow: auto;
  padding: 0 ${UNIT * 2}px;
  ${hideScrollBar()}

  ${props => props.noPadding && `
    padding: 0;
  `}
`;

export const AsideSubheaderStyle = styled.div<{
  visible: boolean;
}>`
  border-bottom: 1px solid transparent;
  height: ${ASIDE_HEADER_HEIGHT}px;
  overflow-x: auto;
  position: absolute;
  top: ${ASIDE_HEADER_HEIGHT}px;

  ${hideScrollBar()}

  ${props => `
    background-color: ${(props.theme.background || dark.background).table};
  `}

  ${props => !props.visible && `
    border-color: ${(props.theme.borders || dark.borders).medium} !important;
  `}
`;

export const BeforeStyle = styled.aside<{
  autoLayout?: boolean;
  heightOffset?: number;
  inline?: boolean;
}>`
  ${ASIDE_STYLE}

  left: 0;
`;

export const BeforeInnerStyle = styled.div<ScrollbarTrackType & {
  contained?: boolean;
  heightOffset?: number;
  verticalOffset?: number;
}>`
  ${ASIDE_INNER_STYLE}
  overflow: hidden;
  margin-right: ${SCROLLBAR_WIDTH_SMALL}px;

  &:hover {
    overflow: auto;
    margin-right: 0;
  }

  ${props => props.contained && `
    border-left: 1px solid ${(props.theme.borders || dark.borders).medium} !important;
  `}
`;

export const AfterStyle = styled.aside<{
  autoLayout?: boolean;
  heightOffset?: number;
  inline?: boolean;
}>`
  ${ASIDE_STYLE}

  right: 0;
`;

export const AfterInnerStyle = styled.div<ScrollbarTrackType & {
  heightMinus?: number;
  overflow?: string;
  verticalOffset?: number;
}>`
  ${ASIDE_INNER_STYLE}

  ${props => props.overflow && `
    overflow: ${props.overflow};
  `}

  ${props => props.heightMinus && `
    height: calc(100% - ${props.heightMinus}px);
  `}
`;

export const DraggableStyle = styled.div<{
  active?: boolean;
  contrast?: boolean;
  disabled?: boolean;
  left?: number;
  right?: number;
  top?: number;
  topOffset?: number;
}>`
  ${ASIDE_DRAGGABLE_STYLE}

  ${props => typeof props.left !== 'undefined' && `
    border-left-style: solid;
    border-left-width: 1px;
    left: ${props.left}px;
  `}

  ${props => typeof props.right !== 'undefined' && `
    border-right-style: solid;
    border-right-width: 1px;
    right: ${props.right}px;
  `}

  ${props => !props.contrast && `
    border-color: ${(props.theme.borders || dark.borders).medium};
  `}

  ${props => props.contrast && `
    border-color: ${(props.theme.borders || dark.borders).light};
  `}
`;

export const MainWrapper = styled.div<{
  autoLayout?: boolean;
  noBackground?: boolean;
  inline?: boolean;
}>`
  height: 100%;
  z-index: 1;

  ${props => `
    position: ${props.inline ? 'absolute' : 'fixed'};
  `}

  ${props => !props.noBackground && `
    background-color: ${(props.theme.background || dark.background).codeArea};
  `}

  ${props => props.autoLayout && `
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  `}
`;

export const MainContentStyle = styled.div<{
  autoLayout?: boolean;
  beforeVisible?: boolean;
  footerOffset?: number;
  headerOffset?: number;
  inline?: boolean;
}>`
  z-index: 2;

  ${props => !props.autoLayout && `
    height: calc(100% - ${(props.headerOffset || 0) + (props.footerOffset || 0)}px);
    position: ${props.inline ? 'relative' : 'fixed'};
  `}

  ${props => !props.autoLayout && !props.inline && `
    top: ${props.headerOffset || 0}px;
  `}

  ${props => props.autoLayout && `
    display: flex;
    flex-direction: column;
    flex: 1;
    justify-content: space-between;
    overflow: auto;
    position: relative;
  `}
`;

export const MainContentInnerStyle = styled.div<{
  autoLayout?: boolean;
  noScrollbarTrackBackground?: boolean;
}>`
  ${PlainScrollbarStyledCss}

  overflow: auto;

  ${props => !props.autoLayout && `
    height: 100%;
  `}

  ${props => props.autoLayout && `
    flex: 1;
  `}
`;

export const NavigationStyle = styled.div`
  position: relative;
`;

export const NavigationInnerStyle = styled.div<{
  aligned: 'left' | 'right';
}>`
  height: 100%;
  position: fixed;
  z-index: 6;

  ${props => props.aligned === 'left' && `
    border-right: 1px solid ${(props.theme.borders || dark.borders).medium};
    left: 0;
  `}

  ${props => props.aligned === 'right' && `
    border-left: 1px solid ${(props.theme.borders || dark.borders).medium};
    right: 0;
  `}
`;


export const NavigationContainerStyle = styled.div<{
  aligned: 'left' | 'right';
  fullWidth: boolean;
  heightOffset: number;
  widthOffset: number;
}>`
  ${PlainScrollbarStyledCss}

  overflow: auto;
  position: absolute;
  width: fit-content;

  ${props => `
    height: calc(100vh - ${props.heightOffset}px);
  `}

  ${props => props.fullWidth && `
    width: calc(100% - ${props.widthOffset || 0}px);
  `}

  ${props => props.widthOffset && props.aligned === 'left' && `
    left: ${props.widthOffset}px;
  `}

  ${props => props.widthOffset && props.aligned === 'right' && `
    right: ${props.widthOffset}px;
  `}
`;

export const AsideFooterStyle = styled.div<{
  bottom?: number;
  contained?: boolean;
  inline?: boolean;
}>`
  border-left: 1px solid transparent;
  border-right: 1px solid transparent;
  border-top: 1px solid transparent;
  position: fixed;
  z-index: 3;

  ${props => `
    border-top-color: ${(props.theme.borders || dark.borders).medium} !important;
  `}

  ${props => !props.inline && `
    background-color: ${(props.theme.background || dark.background).panel};
  `}

  ${props => props.contained && `
    border-left-color: ${(props.theme.borders || dark.borders).medium} !important;
  `}

  ${props => (typeof props.bottom === 'undefined' || props.bottom === null) && `
    bottom: 0;
  `}

  ${props => typeof props.bottom !== 'undefined' && props.bottom !== null && `
    bottom: ${props.bottom}px;
  `}
`;
