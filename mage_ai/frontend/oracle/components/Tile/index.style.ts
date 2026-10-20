import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS_LARGE } from '@oracle/styles/units/borders';
import { UNIT } from '@oracle/styles/units/spacing';

const REGULAR_SIZE = UNIT * 12.5;
const COMPACT_SIZE = UNIT * 8;
export const REGULAR_ICON_SIZE = UNIT * 5;
export const COMPACT_ICON_SIZE = UNIT * 3;

export const TileContainerStyle = styled.div<{
  compact?: boolean;
}>`
  padding: ${UNIT * 2.5}px;
  border-radius: ${BORDER_RADIUS_LARGE}px;
  height: ${REGULAR_SIZE}px;
  width: ${REGULAR_SIZE}px;

  ${props => `
    background-color: ${(props.theme || dark).background.chartBlock};
  `}

  ${props => props.compact && `
    height: ${COMPACT_SIZE}px;
    width: ${COMPACT_SIZE}px;
  `}
`;
