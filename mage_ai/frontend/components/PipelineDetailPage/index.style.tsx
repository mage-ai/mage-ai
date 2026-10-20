import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const BannerStyle = styled.div<{
  background?: string;
  backgroundImage?: string;
}>`
  border-radius: ${BORDER_RADIUS}px;
  padding: ${3 * UNIT}px;

  ${props => `
    box-shadow: ${(props.theme.shadow || dark.shadow).small};
  `}

  ${props => props.background && `
    background: ${props.background};
  `}

  ${props => props.backgroundImage && `
    background-image: url("${props.backgroundImage}");
    background-position: center;
    background-repeat: no-repeat;
    background-size: cover;
  `}
`;
