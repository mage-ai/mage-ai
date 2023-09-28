import { ScrollbarStyledCss, hideScrollBar } from '@oracle/styles/scrollbars';
import styled from 'styled-components';

export const OUTPUT_HEIGHT = 300;

export const OutputHeaderStyle = styled.div`
  ${hideScrollBar()}

  overflow-x: auto;
`;

export const OutputContainerStyle = styled.div<{
  height?: number;
  maxHeight?: number;
  noScrollbarTrackBackground?: boolean;
}>`
  ${ScrollbarStyledCss}

  overflow-y: scroll;

  ${props => props.height && `
    height: ${props.height}px;
  `}

  ${props => !props.height && `
    max-height: ${props.maxHeight || OUTPUT_HEIGHT}px;
  `}
`;
