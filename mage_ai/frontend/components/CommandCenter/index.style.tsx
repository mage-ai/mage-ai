import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_XLARGE } from '@oracle/styles/units/borders';
import { FONT_FAMILY_MEDIUM } from '@oracle/styles/fonts/primary';
import { LARGE } from '@oracle/styles/fonts/sizes';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

export const MAX_WIDTH = 100 * UNIT;

export const ContainerStyle = styled.div`
  border-radius: ${BORDER_RADIUS_XLARGE}px;
  left: 50%;
  position: fixed;
  top: 50%;
  transform: translate(-50%, -50%);
  width: ${MAX_WIDTH}px;

  ${props => `
    background-color: ${(props.theme || dark).background.panel};
    box-shadow: ${(props.theme || dark).shadow.window};
    border: 1px solid ${(props.theme || dark).monotone.grey500};
  `}
`;

export const InputContainerStyle = styled.div`
  padding: ${1 * UNIT}px;
`;

export const InputStyle = styled.input`
  ${LARGE}

  background: none;
  border: none;
  font-family: ${FONT_FAMILY_MEDIUM};
  padding: ${1 * UNIT}px;
  width: 100%;

  ${props => `
    color: ${(props.theme || dark).content.active};
  `}
`;

export const ItemsContainerStyle = styled.div`
  height: ${50 * UNIT}px;
  padding: ${1 * UNIT}px;

  ${props => `
    border-top: 1px solid ${(props.theme || dark).monotone.grey500};
  `}
`;
