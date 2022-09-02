import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';

export const ContainerStyle = styled.div`
  border-bottom: 1px solid ${dark.borders.medium};
  padding: ${PADDING}px;
`;

export const CardsStyle = styled.div`
  ${ScrollbarStyledCss}

  height: 80px;

  display: flex;
  overflow-x: scroll;
`;

export const VariableCardStyle = styled.div`
  background-color: ${dark.background.output};
  border-radius: ${BORDER_RADIUS}px;
  flex-shrink: 0;
  margin-right: ${UNIT}px;
  padding: ${PADDING}px;
`;
