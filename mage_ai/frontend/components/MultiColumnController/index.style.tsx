import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { DRAGGABLE_WIDTH as DRAGGABLE_WIDTH_INIT } from '@components/TripleLayout/index.style';
import { transition } from '@oracle/styles/mixins';

export const DRAGGABLE_WIDTH = DRAGGABLE_WIDTH_INIT
export const DIVIDER_WIDTH = 2;

export const ColumnStyle = styled.div<{
  width?: number;
}>`
  align-items: stretch;
  display: flex;
  height: 100%;

  ${props => `
    width: ${props.width}px;
  `}
`;

export const VerticalDividerStyle = styled.div<{
  backgroundColor?: string;
  backgroundColorHover?: string;
}>`
  ${transition()}

  cursor: col-resize;
  position: relative;
  width: ${DIVIDER_WIDTH}px;
  z-index: 5;

  ${props => `
    background-color: ${props?.backgroundColor || (props.theme || dark).background.codeTextarea};

    &:hover {
      background-color: ${props?.backgroundColorHover || props?.backgroundColor || (props.theme || dark).content.active};
    }
  `}
`;
