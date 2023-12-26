import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const ItemStyle = styled.div<{
  focused?: boolean;
}>`
  ${transition()}

  border-radius: ${BORDER_RADIUS}px;
  cursor: pointer;
  padding: ${1.5 * UNIT}px;

  ${props => `
    &:hover {
      background-color: ${(props.theme || dark).interactive.defaultBackground};
    }
  `}

  ${props => props.focused && `
    background-color: ${(props.theme || dark).interactive.hoverBackground};

    &:hover {
      background-color: ${(props.theme || dark).interactive.hoverBackground};
    }
  `}
`;
