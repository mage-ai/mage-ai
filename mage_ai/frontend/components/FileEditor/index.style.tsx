import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const OverlayStyle = styled.div<{
  ready?: boolean;
}>`
  ${transition()}

  backdrop-filter: saturate(${20 * UNIT}%) blur(${1 * UNIT}px);
  bottom: 0;
  height: inherit;
  left: 0;
  pointer-events: none;
  position: absolute;
  right: 0;
  top: 0;
  width: inherit;
  z-index: 1;

  ${props => props?.ready && `
    opacity: 0;
  `}
`;
