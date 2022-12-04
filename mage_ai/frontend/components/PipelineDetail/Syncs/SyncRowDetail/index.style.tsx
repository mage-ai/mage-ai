import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { FONT_FAMILY_REGULAR } from '@oracle/styles/fonts/primary';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { REGULAR } from '@oracle/styles/fonts/sizes';

export const BarStyle = styled.div<{
  even: boolean;
  fill: boolean;
}>`
  display: flex;
  flex: 1;
  height: ${2 * UNIT}px;

  ${props => props.even && props.fill && `
    background-color: ${(props.theme.accent || dark.accent).cyan};

  `}

  ${props => props.even && !props.fill && `
    background-color: ${(props.theme.accent || dark.accent).cyanTransparent};
  `}
`;
