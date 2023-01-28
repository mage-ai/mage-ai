import styled from 'styled-components';

import { ASIDE_HEADER_HEIGHT } from '@components/TripleLayout/index.style';
import { COLUMN_HEADER_CHART_HEIGHT } from '@components/datasets/overview/utils';
import { REGULAR_LINE_HEIGHT } from '@oracle/styles/fonts/sizes';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import { UNIT } from '@oracle/styles/units/spacing';

export const TOTAL_PADDING = UNIT * 4;
export const TABLE_COLUMN_HEADER_HEIGHT = COLUMN_HEADER_CHART_HEIGHT + (UNIT * 3) + REGULAR_LINE_HEIGHT;

export const SidekickContainerStyle = styled.div<{ fullWidth: boolean }>`
  height: calc(100vh - ${ASIDE_HEADER_HEIGHT}px - ${SCROLLBAR_WIDTH}px);
  width: fit-content;

  ${props => props.fullWidth && `
    width: 100%;
  `}
`;

export const PaddingContainerStyle = styled.div<{ noPadding?: boolean }>`
  padding: ${UNIT * 2}px;

  ${props => props.noPadding && `
    padding: 0;
  `}
`;

export const TableStyle = styled.table<any>`
  ${props => props.width && `
    width: ${props.width}px;
  `}
`;

export const CellStyle = styled.td<any>`
  display: flex;
  align-items: center;
  justify-content: space-between;

  border: 1px solid #1C1C1C;
  height: 100%;

  ${props => !props.noPadding && `
    padding: 0 ${2 * UNIT}px;
  `}
`
