import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS, BORDER_RADIUS_SMALL } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';
import { transition } from '@oracle/styles/mixins';

export const LOGO_HEIGHT = 2.5 * UNIT;
export const HEADER_HEIGHT = 6 * UNIT;

export const HeaderStyle = styled.div`
  height: ${HEADER_HEIGHT}px;
  left: 0;
  position: fixed;
  top: 0;
  width: 100%;
  padding-left: ${2 * UNIT}px;
  padding-right: ${2 * UNIT}px;

  ${props => `
    background-color: ${(props.theme.background || dark.background).panel};
  `}
`;
