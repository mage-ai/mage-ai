import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_XLARGE, BORDER_STYLE, BORDER_WIDTH } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

export const WIDTH_OFFSET = ((BORDER_WIDTH + (PADDING_UNITS * UNIT)) * 2)
  // Margin left and right
  + (2 * UNIT);

export const ItemStyle = styled.div`
  border-radius: ${BORDER_RADIUS_XLARGE}px;
  margin-left: ${1 * UNIT}px;
  margin-right: ${1 * UNIT}px;
  padding: ${PADDING_UNITS * UNIT}px;

  ${props => `
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).interactive.defaultBorder};
  `}
`;
