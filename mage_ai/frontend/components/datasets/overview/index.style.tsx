import styled from 'styled-components';

import light from '@oracle/styles/themes/light';
import { PADDING_UNITS, UNIT } from '@oracle/styles/units/spacing';

const ASIDE_WIDTH = UNIT * 40;
const ASIDE_MARGIN = PADDING_UNITS * UNIT;;
export const ASIDE_TOTAL_WIDTH = (UNIT * 40) + ASIDE_MARGIN;

export const AsideStyle = styled.aside`
  margin-left: ${ASIDE_MARGIN}px;
  width: ${UNIT * 40}px;
}
`;
