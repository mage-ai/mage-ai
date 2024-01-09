import styled from 'styled-components';

import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';

const StyledScrollbarContainer = styled.div<{
  width?: number;
}>`
  ${ScrollbarStyledCss}

  overflow: auto;

  ${props => props.width && `
    width: ${props.width}px;
  `}
`;

export default StyledScrollbarContainer;
