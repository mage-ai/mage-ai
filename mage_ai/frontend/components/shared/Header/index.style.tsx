import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { UNIT } from '@oracle/styles/units/spacing';

export const LOGO_HEIGHT = 2.5 * UNIT;
export const HEADER_HEIGHT = 6 * UNIT;

export const HeaderStyle = styled.div`
  height: ${HEADER_HEIGHT}px;
  left: 0;
  padding-left: ${2 * UNIT}px;
  padding-right: ${2 * UNIT}px;
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 10;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
    border-bottom: 1px solid ${(props.theme.borders || dark.borders).medium};
  `}
`;
