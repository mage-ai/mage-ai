import styled from 'styled-components';

import dark from '@oracle/styles/themes/dark';
import { BORDER_RADIUS } from '@oracle/styles/units/borders';
import {
  HORIZONTAL_PADDING as TABLE_HORIZONTAL_PADDING,
  VERTICAL_PADDING as VERTICAL_PADDING_TABLE,
} from '@components/shared/Table/index.style';
import { UNIT } from '@oracle/styles/units/spacing';

export const HORIZONTAL_PADDING = TABLE_HORIZONTAL_PADDING;
export const VERTICAL_PADDING = 2 * UNIT;
export const NODE_MIN_HEIGHT = 5 * UNIT + (2 * VERTICAL_PADDING);

export const NodeStyle = styled.div<{
  height?: number;
}>`
  border-radius: ${BORDER_RADIUS}px;

  ${props => `
    background-color: ${(props.theme || dark).background.dashboard};
    border: 1px solid ${(props.theme || dark).borders.light};
  `}

  ${props => props.height && `
    height: ${props.height}px;
  `}
`;

export const NodeHeaderStyle = styled.div`
  padding-left: ${HORIZONTAL_PADDING}px;
  padding-right: ${HORIZONTAL_PADDING}px;
  padding-top: ${VERTICAL_PADDING}px;
  padding-bottom: ${VERTICAL_PADDING}px;

  ${props => `
    border-bottom: 1px solid ${(props.theme || dark).borders.light};
  `}
`;
