import styled from 'styled-components';

import { COLUMN_HEADER_CHART_HEIGHT } from '@components/datasets/overview/utils';
import { REGULAR_LINE_HEIGHT } from '@oracle/styles/fonts/sizes';
import { UNIT } from '@oracle/styles/units/spacing';

export const TOTAL_PADDING = 4 * UNIT;
export const TABLE_COLUMN_HEADER_HEIGHT = COLUMN_HEADER_CHART_HEIGHT + (UNIT * 3) + REGULAR_LINE_HEIGHT

export const ContainerStyle = styled.div`
  padding: ${UNIT * 2}px;
  height: calc(100vh - 48px);
`;
