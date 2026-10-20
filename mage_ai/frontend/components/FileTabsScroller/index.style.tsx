import styled from 'styled-components';

import { UNIT } from '@oracle/styles/units/spacing';
import { hideScrollBar } from '@oracle/styles/scrollbars';
import { transition } from '@oracle/styles/mixins';

export const ICON_SIZE = 2.5 * UNIT;

export const ScrollerStyle = styled.div`
  ${hideScrollBar()}

  align-items: center;
  display: flex;
  flex-direction: row;
  height: 100%;
  overflow: auto;
`;

export const ArrowCount = styled.div<{
  right?: boolean;
}>`
  display: none;

  ${transition()}

  position: absolute;
  z-index: 1;

  ${props => props.right && `
    right: 0px;
  `}
`;

export const CountInnerStyle = styled.div`
  align-items: center;
  display: flex;
`;
