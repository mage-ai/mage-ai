import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_WIDTH, BORDER_STYLE, BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_HORIZONTAL, UNIT } from '@oracle/styles/units/spacing';

export const BannerStyle = styled.div`
  border-radius: ${BORDER_RADIUS}px;
  padding: ${1.5 * UNIT}px ${PADDING_HORIZONTAL}px;

  ${props => `
    border: ${BORDER_WIDTH}px ${BORDER_STYLE} ${(props.theme || dark).interactive.defaultBorder};
  `}
`;
