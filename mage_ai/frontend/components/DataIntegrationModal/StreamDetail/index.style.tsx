import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
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
