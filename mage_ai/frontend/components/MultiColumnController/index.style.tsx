import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { DRAGGABLE_WIDTH as DRAGGABLE_WIDTH_INIT } from '@components/TripleLayout/index.style';
import { transition } from '@oracle/styles/mixins';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';

export const DRAGGABLE_WIDTH = DRAGGABLE_WIDTH_INIT;
export const DIVIDER_WIDTH = 2;

export const ColumnStyle = styled.div<{
  height?: number;
  width?: number;
}>`
  ${ScrollbarStyledCss}

  align-items: stretch;
  display: flex;

  ${props => `
    width: ${props.width}px;
  `}

  ${props => !props.height && `
    height: 100%;
  `}

  ${props => props.height && `
    height: ${props.height}px;
    overflow: auto;
  `}
`;

export const VerticalDividerStyle = styled.div<{
  backgroundColor?: string;
  backgroundColorHover?: string;
}>`
  ${transition()}

  // cursor: col-resize;
  position: relative;
  width: ${DIVIDER_WIDTH}px;
  z-index: 5;

  ${props => `
    background-color: ${props?.backgroundColor || (props.theme || dark).borders.medium2};

    // &:hover {
    //   background-color: ${props?.backgroundColorHover || props?.backgroundColor || (props.theme || dark).content.active};
    // }
  `}
`;

