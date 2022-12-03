import styled from 'styled-components';

import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';

export const TabsContainerStyle = styled.div<{
  allowScroll?: boolean;
  noPadding?: boolean;
}>`
  padding-left: ${PADDING_UNITS * UNIT}px;
  padding-right: ${PADDING_UNITS * UNIT}px;

  ${props => props.noPadding && `
    padding: 0;
  `}

  ${props => props.allowScroll && `
    overflow: auto;
  `}

  ${ScrollbarStyledCss}
`;
