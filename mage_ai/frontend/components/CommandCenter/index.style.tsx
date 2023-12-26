import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { LARGE_LG } from '@oracle/styles/fonts/sizes';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { FONT_FAMILY_MEDIUM } from '@oracle/styles/fonts/primary';

export const MAX_WIDTH = 100 * UNIT;

export const ContainerStyle = styled.div`
  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;
  left: 50%;
  padding: ${1 * UNIT}px;
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%);
  width: ${MAX_WIDTH}px;

  ${props => `
    box-shadow: ${(props.theme || dark).shadow.popup};
  `}
`;

export const InputStyle = styled.input`
  ${LARGE_LG}

  background: none;
  border: none;
  font-family: ${FONT_FAMILY_MEDIUM};
  padding: 0;
  width: 100%;

  ${props => `
    color: ${(props.theme || dark).content.active};
  `}
`;
