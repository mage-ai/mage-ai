import { ScrollbarStyledCss, hideScrollBar } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';
import styled, { css, keyframes } from 'styled-components';
import dark from '@oracle/styles/themes/dark';

export const DragHandleStyle = styled.div<{
  isDragging?: boolean;
  isHidden?: boolean;
}>`
  height: 4px;
  cursor: row-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  flex-shrink: 0;
  position: relative;

  ${props => `
    background-color: ${(props.theme.interactive || dark.interactive).defaultBorder};
  `}

  &:hover {
    ${props => !props.isDragging && css`
      animation: ${delayedHover} 0s 1s forwards;
    `}
  }

  ${props => props.isDragging && `
    background-color: ${(props.theme.content || dark.content).active} !important;
  `}
`;

const delayedHover = keyframes`
  0% {
    background-color: transparent;
  }
  100% {
    background-color: ${dark.content.active};
  }
`;

export const PipelineExecutionWrapperStyle = styled.div<{
  panelHeight: number;
}>`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;

  ${props => `
    height: ${props.panelHeight}px;
    background-color: ${(props.theme.background || dark.background).panel};
  `}
`;

export const OutputHeaderStyle = styled.div`
  ${hideScrollBar()}

  overflow-x: auto;
  overflow-y: hidden;
  flex-shrink: 0;
  height: 48px;
  padding: ${UNIT}px ${UNIT * 2}px 0;
`;

export const OutputContainerStyle = styled.div<{
  height?: number;
  maxHeight?: number;
  noScrollbarTrackBackground?: boolean;
}>`
  ${ScrollbarStyledCss}

  overflow-y: auto;
  flex: 1;
  min-height: 0;

  ${props =>
    props.height &&
    `
    height: ${props.height}px;
  `}

  ${props =>
    !props.height &&
    !props.maxHeight &&
    `
    flex: 1;
  `}

  ${props =>
    !props.height &&
    props.maxHeight &&
    `
    max-height: ${props.maxHeight}px;
  `}

  padding: 0 0 0 ${UNIT}px;
`;
