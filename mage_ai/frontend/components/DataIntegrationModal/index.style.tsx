import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const MODAL_PADDING = 8 * UNIT;

export const ContainerStyle = styled.div<{
  maxWidth?: number;
}>`
  border-radius: ${BORDER_RADIUS}px;
  position: relative;

  ${props => `
    border: 1px solid ${(props.theme.borders || dark.borders).light};
    background-color: ${(props.theme.background || dark.background).panel};
  `}

  ${props => props.maxWidth && `
    width: ${props.maxWidth}px;
  `}
`;

export const HeaderStyle = styled.div`
  padding: ${PADDING_UNITS * UNIT}px;

  ${props => `
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).light};
  `}
`;

export const NavigationStyle = styled.div<{
  selected?: boolean;
}>`
  ${transition()}

  ${props => !props.selected && `
    &:hover {
      background-color: ${(props.theme.interactive || dark.interactive).rowHoverBackground};
    }
  `}

  ${props => props.selected && `
    background-color: ${(props.theme.background || dark.background).codeTextarea};
  `}
`;

export const StreamGridStyle = styled.div<{
  selected?: boolean;
}>`
  border-radius: ${BORDER_RADIUS}px;
  padding: ${PADDING_UNITS * UNIT}px;
  margin: ${1 * UNIT}px;

  &:hover {
    cursor: pointer;
  }

  ${props => `
    border: 1px solid ${(props.theme.borders || dark.borders).light};
  `}

  ${props => props.selected && `
    background-color: ${(props.theme.background || dark.background).panel};
  `}
`;
