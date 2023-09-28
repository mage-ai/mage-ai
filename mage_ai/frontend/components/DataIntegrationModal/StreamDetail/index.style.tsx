import styled, { css } from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { transition } from '@oracle/styles/mixins';

export const SectionStyle = styled.div<{
  noPadding?: boolean;
}>`
  border-radius: ${BORDER_RADIUS}px;

  ${props => `
    border: 1px solid ${(props.theme.borders || dark.borders).light};
  `}

  ${props => !props.noPadding && `
    padding: ${PADDING_UNITS * UNIT}px;
  `}
`;
