import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING } from '@oracle/styles/units/spacing';

export const DateSelectionContainer = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  background-color: ${dark.interactive.defaultBackground};
  padding: ${PADDING}px;
`;
