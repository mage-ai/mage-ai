import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

export const ICON_SIZE = UNIT * 2.5;

export const HeaderStyle = styled.div`
  border-top-left-radius: ${BORDER_RADIUS}px;
  border-top-right-radius: ${BORDER_RADIUS}px;
  padding: ${UNIT * 1}px;

  ${props => `
    background-color: ${(props.theme || dark).background.chartBlock};
  `}
`;
