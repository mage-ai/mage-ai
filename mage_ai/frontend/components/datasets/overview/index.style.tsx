import styled from 'styled-components';

import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

const ASIDE_WIDTH = UNIT * 40;
const ASIDE_MARGIN = PADDING_UNITS * UNIT;
export const ASIDE_TOTAL_WIDTH = (UNIT * 40) + ASIDE_MARGIN;

export const AsideStyle = styled.aside<any>`
  margin-left: ${ASIDE_MARGIN}px;
  width: ${ASIDE_WIDTH}px;

  ${props => props.fullWidth && `
    width: 100%;
  `}
}
`;
