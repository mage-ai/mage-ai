import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_LARGE, BORDER_RADIUS } from '@oracle/styles/units/borders';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';

export const ScrollbarContainerStyle = styled.div<{
  height: number;
  left?: number;
  right?: number;
}>`
  position: fixed;
  width: ${SCROLLBAR_WIDTH}px;

  ${props => `
    border-radius: ${BORDER_RADIUS}px;
    background: ${(props.theme.background || dark.background).scrollbarTrack};
  `}

  ${props => typeof props.height !== 'undefined' && `
    height: ${props.height}px;
  `}

  ${props => typeof props.left !== 'undefined' && `
    left: ${props.left}px;
  `}
`;

export const ScrollCursorStyle = styled.div<{
  height?: number;
  selected?: boolean;
  top?: number;
}>`
  position: fixed;
  width: ${SCROLLBAR_WIDTH}px;
  z-index: 3;

  ${props => `
    border-radius: ${BORDER_RADIUS_LARGE}px;
    background: ${(props.theme.background || dark.background).scrollbarThumb};

    &:hover {
      background: ${(props.theme.background || dark.background).scrollbarThumbHover};
    }
  `}

  ${props => props?.selected && `
    background: ${(props.theme.background || dark.background).scrollbarThumbHover};
  `}

  ${props => typeof props.height !== 'undefined' && `
    height: ${props.height}px;
  `}

  ${props => typeof props.top !== 'undefined' && `
    top: ${props.top}px;
  `}
`;
