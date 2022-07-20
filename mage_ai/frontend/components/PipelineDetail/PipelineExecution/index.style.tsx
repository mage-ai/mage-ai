import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import styled from 'styled-components';

export const OUTPUT_HEIGHT = 300;

export const OutputContainerStyle = styled.div<{
  height?: number;
}>`
  ${ScrollbarStyledCss}

  overflow-y: scroll;

  ${props => props.height && `
    height: ${props.height}px;
  `}

  ${props => !props.height && `
    height: ${OUTPUT_HEIGHT}px;
  `}
`
