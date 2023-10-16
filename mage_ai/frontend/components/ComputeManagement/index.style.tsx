import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_XXXLARGE } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const CardStyle = styled.div<{
  inline?: boolean;
}>`
  ${transition()}

  border-radius: ${BORDER_RADIUS_XXXLARGE}px;
  padding: ${UNIT * 2.5}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
    border: 1px solid ${(props.theme.borders || dark.borders).darkLight};
    box-shadow: ${(props.theme.shadow || dark.shadow).frame};
  `}

  ${props => !props.inline && `
    height: ${28 * UNIT}px;
    width: ${40 * UNIT}px;
    margin: ${(PADDING_UNITS / 2) * UNIT}px;
  `}
`;
