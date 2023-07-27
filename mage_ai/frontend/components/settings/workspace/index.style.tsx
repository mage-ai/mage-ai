import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

export const ContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  padding: ${PADDING_UNITS * UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).codeArea};
  `}
`;
