import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_WIDTH, BORDER_STYLE, BORDER_RADIUS } from '@oracle/styles/units/borders';
import { PADDING_HORIZONTAL, UNIT } from '@oracle/styles/units/spacing';

const DOT_SIZE = UNIT / 2;

export const ProgressDotsStyle = styled.div<{
  width: number;
}>`
  ${props => `
    border-top-color: ${(props.theme || dark).accent.positive};
    border-top-width: ${DOT_SIZE}px;
    border-top-style: dotted;
    height: ${DOT_SIZE}px;
    width: ${props.width}%;
  `}
`;
