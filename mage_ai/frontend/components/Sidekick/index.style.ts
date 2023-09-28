import styled from 'styled-components';

import { ALL_HEADERS_HEIGHT } from '@components/TripleLayout/index.style';
import { COLUMN_HEADER_CHART_HEIGHT } from '@components/datasets/overview/utils';
import { REGULAR_LINE_HEIGHT } from '@oracle/styles/fonts/sizes';
import { ScrollbarStyledCss } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

export const TOTAL_PADDING = UNIT * 4;
export const TABLE_COLUMN_HEADER_HEIGHT = COLUMN_HEADER_CHART_HEIGHT + (UNIT * 3) + REGULAR_LINE_HEIGHT;

export const SidekickContainerStyle = styled.div<{
  fullWidth: boolean;
  heightOffset: number;
  overflowHidden?: boolean;
}>`
  ${ScrollbarStyledCss}

  overflow: auto;
  position: absolute;
  width: 100%;

  ${props => `
    height: calc(100vh - ${ALL_HEADERS_HEIGHT}px - ${props.heightOffset}px);
  `}

  ${props => props.overflowHidden && `
    overflow: hidden;
  `}
`;

export const PaddingContainerStyle = styled.div<{ noPadding?: boolean }>`
  padding: ${UNIT * 2}px;

  ${props => props.noPadding && `
    padding: 0;
  `}
`;
